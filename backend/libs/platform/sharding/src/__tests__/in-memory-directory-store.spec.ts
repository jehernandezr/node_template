import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { DirectoryWriteResult } from '../model/directory-write-result.enum.js';
import { InMemoryDirectoryStore } from './utils/in-memory-directory-store.js';
import { PlacementBuilder, runDirectoryStoreContract } from './utils/index.js';

runDirectoryStoreContract('InMemoryDirectoryStore', async () => {
  const store = new InMemoryDirectoryStore();
  return {
    store,
    writer: store,
    seedInstance: async (shard: string, instance: string) =>
      store.setInstance(shard, instance),
  };
});

describe('InMemoryDirectoryStore', () => {
  describe('when using the plain setters', () => {
    it('stores, replaces and removes placements', async () => {
      const store = new InMemoryDirectoryStore();
      const placement = PlacementBuilder.aPlacement().build();
      store.setPlacement(placement);
      await expect(store.getPlacement(placement.tenantId)).resolves.toEqual(
        placement,
      );
      store.removePlacement(placement.tenantId);
      await expect(
        store.getPlacement(placement.tenantId),
      ).resolves.toBeUndefined();
    });

    it('stores and removes instances', async () => {
      const store = new InMemoryDirectoryStore();
      store.setInstance('shard-1', 'pg-1');
      await expect(store.getInstance('shard-1')).resolves.toBe('pg-1');
      store.removeInstance('shard-1');
      await expect(store.getInstance('shard-1')).resolves.toBeUndefined();
    });
  });

  describe('when a version is not the next one', () => {
    it('rejects with an invalid configuration', async () => {
      const store = new InMemoryDirectoryStore();
      await expect(
        store.putPlacement(
          PlacementBuilder.aPlacement().withVersion(3).build(),
          undefined,
        ),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.InvalidConfiguration,
      });
    });
  });

  describe('when a dedicated shard is shared', () => {
    it('keeps the shard exclusive in both directions', async () => {
      const store = new InMemoryDirectoryStore();
      await store.putPlacement(
        PlacementBuilder.aPlacement().dedicated().build(),
        undefined,
      );
      await expect(
        store.putPlacement(
          PlacementBuilder.aPlacement().withTenantId('t2').build(),
          undefined,
        ),
      ).resolves.toBe(DirectoryWriteResult.ShardTaken);
    });
  });
});
