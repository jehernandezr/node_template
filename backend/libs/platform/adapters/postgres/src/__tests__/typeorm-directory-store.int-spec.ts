import { PersistenceErrorCode } from '@platform/persistence';
import { ContainerRuntime, FixedClock } from '@platform/kernel/test-utils';
import {
  DirectoryWriteResult,
  ShardingErrorCode,
  TenantStatus,
} from '@platform/sharding';
import {
  PlacementBuilder,
  runDirectoryStoreContract,
} from '@platform/sharding/test-utils';
import { TypeOrmDirectoryStore } from '../stores/typeorm-directory-store.js';
import { PlatformTestDatabase } from './utils/index.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('TypeOrmDirectoryStore over PostgreSQL', () => {
  const database = new PlatformTestDatabase();
  const tenantA = PlatformTestDatabase.TENANT_A;
  const tenantB = PlatformTestDatabase.TENANT_B;

  beforeAll(async () => {
    await database.start();
  });

  afterAll(async () => {
    await database.stop();
  });

  beforeEach(async () => {
    await database.truncateAll();
  });

  function directory(options: { readPrimary?: boolean } = {}) {
    return new TypeOrmDirectoryStore(
      database.catalogManagers,
      new FixedClock(),
      options,
    );
  }

  describe('contract', () => {
    runDirectoryStoreContract('TypeOrmDirectoryStore contract', async () => {
      await database.truncateAll();
      const store = directory();
      return {
        store,
        writer: store,
        seedInstance: (shard, instance) => store.setInstance(shard, instance),
      };
    });
  });

  describe('when two dedicated placements claim the same empty shard', () => {
    it('writes one and rejects the other with ShardTaken', async () => {
      const store = directory();
      const first = PlacementBuilder.aPlacement()
        .withTenantId(tenantA)
        .withShardGroup('shard-1')
        .dedicated()
        .build();
      const second = PlacementBuilder.aPlacement()
        .withTenantId(tenantB)
        .withShardGroup('shard-1')
        .dedicated()
        .build();

      const results = await Promise.all([
        store.putPlacement(first, undefined),
        store.putPlacement(second, undefined),
      ]);

      expect(
        results.filter((r) => r === DirectoryWriteResult.Written),
      ).toHaveLength(1);
      expect(results).toContain(DirectoryWriteResult.ShardTaken);
    });
  });

  describe('setPlacementIfNewer', () => {
    it('writes a new tenant, refuses the same version and a lower one, and accepts a higher one', async () => {
      const store = directory();
      const placement = (version: number) =>
        PlacementBuilder.aPlacement()
          .withTenantId(tenantA)
          .withShardGroup('shard-1')
          .withVersion(version)
          .build();

      await expect(store.setPlacementIfNewer(placement(2))).resolves.toBe(true);
      await expect(store.setPlacementIfNewer(placement(2))).resolves.toBe(
        false,
      );
      await expect(store.setPlacementIfNewer(placement(1))).resolves.toBe(
        false,
      );
      await expect(store.setPlacementIfNewer(placement(3))).resolves.toBe(true);

      await expect(store.getPlacement(tenantA)).resolves.toMatchObject({
        version: 3,
      });
    });
  });

  describe('listShardLocations', () => {
    it('returns the locations ordered by logical shard', async () => {
      const store = directory();
      await store.setInstance('shard-b', 'inst-2');
      await store.setInstance('shard-a', 'inst-1');

      await expect(store.listShardLocations()).resolves.toEqual([
        { logicalShard: 'shard-a', instance: 'inst-1' },
        { logicalShard: 'shard-b', instance: 'inst-2' },
      ]);
    });
  });

  describe('with readPrimary', () => {
    it('reads what was just written', async () => {
      const store = directory({ readPrimary: true });
      await store.setInstance('shard-a', 'inst-1');

      await expect(store.getInstance('shard-a')).resolves.toBe('inst-1');
    });
  });

  describe('when the input is invalid', () => {
    it('listPlacements rejects an empty region', async () => {
      await expect(directory().listPlacements('')).rejects.toMatchObject({
        code: PersistenceErrorCode.InvalidConfig,
      });
    });

    it('putPlacement rejects a version that does not follow expectedVersion', async () => {
      const placement = PlacementBuilder.aPlacement()
        .withTenantId(tenantA)
        .withVersion(5)
        .build();

      await expect(
        directory().putPlacement(placement, undefined),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.InvalidConfiguration,
      });
    });

    it('putPlacement reports a stored placement that is not expected as a conflict', async () => {
      const store = directory();
      const first = PlacementBuilder.aPlacement()
        .withTenantId(tenantA)
        .withShardGroup('shard-1')
        .build();
      await store.putPlacement(first, undefined);

      await expect(
        store.putPlacement(
          PlacementBuilder.aPlacement()
            .withTenantId(tenantA)
            .withShardGroup('shard-1')
            .withStatus(TenantStatus.Migrating)
            .build(),
          undefined,
        ),
      ).resolves.toBe(DirectoryWriteResult.VersionConflict);
    });
  });
});
