import { InMemoryDirectoryStore } from './in-memory-directory-store.js';
import { TenantStatus } from './types.js';

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
});
