import { PlatformErrorCode } from '@contracts/platform';
import { FixedClock } from '@platform/kernel/testing';
import {
  DirectoryWriteResult,
  ShardAccess,
  ShardKey,
  ShardingErrorCode,
  ShardRouter,
  TenantStatus,
  type TenantPlacement,
} from '@platform/sharding';
import { memoryDatabase } from '../../../test/support/pg-mem.js';
import { Database } from '../database.js';
import { catalogMigrations } from '../migrations/catalog-migrations.js';
import { applyMigrations } from '../migrations/sql-migration.js';
import { PostgresDirectoryStore } from './postgres-directory-store.js';

const TENANT = '0193f1c2-0000-7000-8000-000000000001';

function placement(overrides: Partial<TenantPlacement> = {}): TenantPlacement {
  return {
    tenantId: TENANT,
    region: 'co',
    shardGroup: ['shard-1'],
    status: TenantStatus.Active,
    version: 1,
    dedicated: false,
    ...overrides,
  };
}

async function setup() {
  const memory = memoryDatabase();
  const catalog = new Database({
    name: 'catalog',
    global: true,
    connection: memory.connection,
    context: () => ({}),
  });
  await catalog.readPrimary((session) =>
    applyMigrations(session, catalogMigrations),
  );
  const store = new PostgresDirectoryStore({
    catalog,
    clock: new FixedClock(new Date('2026-11-13T00:00:00.000Z')),
  });
  return { memory, catalog, store };
}

describe('PostgresDirectoryStore on pg-mem', () => {
  it('returns undefined for unknown tenants and shards', async () => {
    const { store } = await setup();
    expect(await store.getPlacement(TENANT)).toBeUndefined();
    expect(await store.getInstance('shard-1')).toBeUndefined();
  });

  it('writes a new placement and reads it back', async () => {
    const { store } = await setup();
    expect(
      await store.setPlacementIfNewer(
        placement({ shardGroup: ['shard-1', 'shard-2'] }),
      ),
    ).toBe(true);
    expect(await store.getPlacement(TENANT)).toEqual(
      placement({ shardGroup: ['shard-1', 'shard-2'] }),
    );
  });

  it('writes only a strictly higher version, like RoutingCache.setIfNewer', async () => {
    const { store } = await setup();
    await store.setPlacementIfNewer(placement({ version: 2 }));
    expect(
      await store.setPlacementIfNewer(placement({ version: 2, region: 'mx' })),
    ).toBe(false);
    expect(
      await store.setPlacementIfNewer(placement({ version: 1, region: 'mx' })),
    ).toBe(false);
    expect((await store.getPlacement(TENANT))?.region).toBe('co');
    expect(
      await store.setPlacementIfNewer(
        placement({
          version: 3,
          status: TenantStatus.Migrating,
          shardGroup: ['shard-9'],
        }),
      ),
    ).toBe(true);
    expect(await store.getPlacement(TENANT)).toEqual(
      placement({
        version: 3,
        status: TenantStatus.Migrating,
        shardGroup: ['shard-9'],
      }),
    );
  });

  it('validates a placement before writing', async () => {
    const { store } = await setup();
    await expect(
      store.setPlacementIfNewer(placement({ shardGroup: [] })),
    ).rejects.toMatchObject({
      code: PlatformErrorCode.PersistenceInvalidConfig,
    });
    await expect(
      store.setPlacementIfNewer(placement({ status: 'gone' as TenantStatus })),
    ).rejects.toMatchObject({
      code: PlatformErrorCode.PersistenceInvalidConfig,
    });
    await expect(
      store.setPlacementIfNewer(placement({ version: -1 })),
    ).rejects.toMatchObject({
      code: PlatformErrorCode.PersistenceInvalidConfig,
    });
  });

  it('fails closed on a corrupt row', async () => {
    const { store, memory } = await setup();
    memory.exec(
      `INSERT INTO shard_directory VALUES ('${TENANT}', 'co', ARRAY['shard-1'], 'unknown', 1, false, now())`,
    );
    await expect(store.getPlacement(TENANT)).rejects.toMatchObject({
      code: PlatformErrorCode.PersistenceCorruptRow,
    });
  });

  it('registers, moves and lists logical shards', async () => {
    const { store } = await setup();
    await store.setInstance('shard-2', 'db-b');
    await store.setInstance('shard-1', 'db-a');
    await store.setInstance('shard-1', 'db-c');
    expect(await store.getInstance('shard-1')).toBe('db-c');
    expect(await store.listShards()).toEqual(['shard-1', 'shard-2']);
  });

  it('feeds a ShardRouter', async () => {
    const { store } = await setup();
    await store.setPlacementIfNewer(placement());
    await store.setInstance('shard-1', 'db-a');
    const router = new ShardRouter({ directory: store, currentRegion: 'co' });
    await expect(
      router.resolve({
        tenantId: TENANT,
        keyKind: ShardKey.Tenant,
        access: ShardAccess.Write,
      }),
    ).resolves.toMatchObject({ logicalShard: 'shard-1', instance: 'db-a' });
  });

  describe('DirectoryWriter', () => {
    const OTHER = '0193f1c2-0000-7000-8000-000000000002';
    const THIRD = '0193f1c2-0000-7000-8000-000000000003';

    it('creates a tenant at version 1 and updates with compare-and-set', async () => {
      const { store } = await setup();
      expect(await store.putPlacement(placement(), undefined)).toBe(
        DirectoryWriteResult.Written,
      );
      expect(
        await store.putPlacement(
          placement({ version: 2, status: TenantStatus.Migrating }),
          1,
        ),
      ).toBe(DirectoryWriteResult.Written);
      expect(await store.getPlacement(TENANT)).toEqual(
        placement({ version: 2, status: TenantStatus.Migrating }),
      );
    });

    it('reports a version conflict for a stale or duplicate write', async () => {
      const { store } = await setup();
      await store.putPlacement(placement(), undefined);
      expect(await store.putPlacement(placement(), undefined)).toBe(
        DirectoryWriteResult.VersionConflict,
      );
      await store.putPlacement(placement({ version: 2 }), 1);
      expect(
        await store.putPlacement(placement({ version: 2, region: 'mx' }), 1),
      ).toBe(DirectoryWriteResult.VersionConflict);
      expect(
        await store.putPlacement(placement({ tenantId: OTHER, version: 6 }), 5),
      ).toBe(DirectoryWriteResult.VersionConflict);
      expect((await store.getPlacement(TENANT))?.region).toBe('co');
      expect(await store.getPlacement(OTHER)).toBeUndefined();
    });

    it('refuses a version that is not expectedVersion + 1', async () => {
      const { store } = await setup();
      await expect(
        store.putPlacement(placement({ version: 3 }), undefined),
      ).rejects.toMatchObject({ code: ShardingErrorCode.InvalidConfiguration });
      await expect(
        store.putPlacement(placement({ version: 2 }), -1),
      ).rejects.toMatchObject({
        code: PlatformErrorCode.PersistenceInvalidConfig,
      });
    });

    it('keeps shards exclusive for dedicated tenants', async () => {
      const { store } = await setup();
      await store.putPlacement(
        placement({ dedicated: true, shardGroup: ['s1', 's2'] }),
        undefined,
      );
      expect(
        await store.putPlacement(
          placement({ tenantId: OTHER, shardGroup: ['s2'] }),
          undefined,
        ),
      ).toBe(DirectoryWriteResult.ShardTaken);
      expect(
        await store.putPlacement(
          placement({
            tenantId: OTHER,
            dedicated: true,
            shardGroup: ['s3', 's1'],
          }),
          undefined,
        ),
      ).toBe(DirectoryWriteResult.ShardTaken);
      expect(await store.getPlacement(OTHER)).toBeUndefined();
      expect(
        await store.putPlacement(
          placement({ tenantId: OTHER, shardGroup: ['s3'] }),
          undefined,
        ),
      ).toBe(DirectoryWriteResult.Written);
    });

    it('lets shared tenants share a shard but not a dedicated one to join', async () => {
      const { store } = await setup();
      await store.putPlacement(placement({ shardGroup: ['s1'] }), undefined);
      expect(
        await store.putPlacement(
          placement({ tenantId: OTHER, shardGroup: ['s1'] }),
          undefined,
        ),
      ).toBe(DirectoryWriteResult.Written);
      expect(
        await store.putPlacement(
          placement({ tenantId: THIRD, dedicated: true, shardGroup: ['s1'] }),
          undefined,
        ),
      ).toBe(DirectoryWriteResult.ShardTaken);
      // A dedicated tenant keeps its own shard when it is updated.
      await store.putPlacement(
        placement({ tenantId: THIRD, dedicated: true, shardGroup: ['s9'] }),
        undefined,
      );
      expect(
        await store.putPlacement(
          placement({
            tenantId: THIRD,
            dedicated: true,
            shardGroup: ['s9'],
            version: 2,
          }),
          1,
        ),
      ).toBe(DirectoryWriteResult.Written);
    });

    it('lists the placements of a region from the primary', async () => {
      const { store } = await setup();
      await store.putPlacement(placement({ tenantId: OTHER }), undefined);
      await store.putPlacement(placement(), undefined);
      await store.putPlacement(
        placement({ tenantId: THIRD, region: 'mx', shardGroup: ['s7'] }),
        undefined,
      );
      const listed = await store.listPlacements('co');
      expect(listed.map((entry) => entry.tenantId)).toEqual([TENANT, OTHER]);
      await expect(store.listPlacements('')).rejects.toMatchObject({
        code: PlatformErrorCode.PersistenceInvalidConfig,
      });
    });
  });
});
