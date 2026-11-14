import { InMemoryDirectoryStore } from './in-memory-directory-store.js';
import { DirectoryWriteResult } from './ports.js';
import { TenantStatus, type TenantPlacement } from './types.js';

function placement(overrides: Partial<TenantPlacement> = {}): TenantPlacement {
  return {
    tenantId: 't1',
    region: 'eu',
    shardGroup: ['shard-1'],
    status: TenantStatus.Active,
    version: 1,
    dedicated: false,
    ...overrides,
  };
}

describe('InMemoryDirectoryStore', () => {
  it('stores, replaces and removes placements and instances', async () => {
    const store = new InMemoryDirectoryStore();
    const placement = {
      tenantId: 't1',
      region: 'eu',
      shardGroup: ['shard-1'],
      status: TenantStatus.Active,
      version: 1,
      dedicated: false,
    };

    await expect(store.getPlacement('t1')).resolves.toBeUndefined();
    store.setPlacement(placement);
    await expect(store.getPlacement('t1')).resolves.toEqual(placement);
    store.removePlacement('t1');
    await expect(store.getPlacement('t1')).resolves.toBeUndefined();

    await expect(store.getInstance('shard-1')).resolves.toBeUndefined();
    store.setInstance('shard-1', 'pg-1');
    await expect(store.getInstance('shard-1')).resolves.toBe('pg-1');
    store.removeInstance('shard-1');
    await expect(store.getInstance('shard-1')).resolves.toBeUndefined();
  });

  describe('conditional writes', () => {
    it('creates a tenant only once', async () => {
      const store = new InMemoryDirectoryStore();
      await expect(store.putPlacement(placement(), undefined)).resolves.toBe(
        DirectoryWriteResult.Written,
      );
      await expect(store.putPlacement(placement(), undefined)).resolves.toBe(
        DirectoryWriteResult.VersionConflict,
      );
    });

    it('updates only from the version the caller read', async () => {
      const store = new InMemoryDirectoryStore();
      await store.putPlacement(placement(), undefined);
      const moved = placement({ shardGroup: ['shard-2'], version: 2 });
      await expect(store.putPlacement(moved, 1)).resolves.toBe(
        DirectoryWriteResult.Written,
      );
      await expect(
        store.putPlacement(placement({ version: 2 }), 1),
      ).resolves.toBe(DirectoryWriteResult.VersionConflict);
      await expect(store.getPlacement('t1')).resolves.toEqual(moved);
    });

    it('refuses a version that is not the next one', async () => {
      const store = new InMemoryDirectoryStore();
      await expect(
        store.putPlacement(placement({ version: 3 }), undefined),
      ).rejects.toMatchObject({ code: 'PLATFORM.SHARDING.INVALID_CONFIG' });
    });

    it('keeps dedicated shards exclusive', async () => {
      const store = new InMemoryDirectoryStore();
      await store.putPlacement(placement({ dedicated: true }), undefined);
      await expect(
        store.putPlacement(placement({ tenantId: 't2' }), undefined),
      ).resolves.toBe(DirectoryWriteResult.ShardTaken);

      await store.putPlacement(
        placement({ tenantId: 't3', shardGroup: ['shard-2'] }),
        undefined,
      );
      await expect(
        store.putPlacement(
          placement({
            tenantId: 't4',
            shardGroup: ['shard-2'],
            dedicated: true,
          }),
          undefined,
        ),
      ).resolves.toBe(DirectoryWriteResult.ShardTaken);
    });

    it('lists the placements of one region', async () => {
      const store = new InMemoryDirectoryStore();
      await store.putPlacement(placement(), undefined);
      await store.putPlacement(
        placement({ tenantId: 't2', region: 'us', shardGroup: ['us-1'] }),
        undefined,
      );
      await expect(store.listPlacements('eu')).resolves.toEqual([placement()]);
    });
  });
});
