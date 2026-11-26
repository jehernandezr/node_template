import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { FakeSmokeOrderRepository } from '../../__tests__/utils/fake-smoke-order-repository.js';
import { RecordingCacheAside } from '../../__tests__/utils/recording-cache-aside.js';
import { SmokeOrder } from '../smoke-order.js';
import { SmokeOrderCache } from '../smoke-order-cache.js';
import { SmokeOrderStatus } from '../smoke-order-status.enum.js';

const TENANT = '0193f1c2-0000-7000-8000-0000000000a1';

describe('SmokeOrderCache', () => {
  it('loads the order through the cache aside and returns plain data', async () => {
    const orders = new FakeSmokeOrderRepository();
    orders.rows.set(
      'o-1',
      new SmokeOrder('o-1', 'Ana', SmokeOrderStatus.Placed, 1),
    );
    const cache = new SmokeOrderCache(
      new RecordingCacheAside().asCacheAside(),
      orders,
      UnroutedShardScopes.create(),
    );

    await expect(cache.read(TENANT, 'o-1')).resolves.toEqual({
      id: 'o-1',
      customer: 'Ana',
      status: SmokeOrderStatus.Placed,
    });
  });

  it('returns null for an unknown order', async () => {
    const cache = new SmokeOrderCache(
      new RecordingCacheAside().asCacheAside(),
      new FakeSmokeOrderRepository(),
      UnroutedShardScopes.create(),
    );

    await expect(cache.read(TENANT, 'missing')).resolves.toBeNull();
  });

  it('invalidates the tenant namespace', async () => {
    const aside = new RecordingCacheAside();
    const cache = new SmokeOrderCache(
      aside.asCacheAside(),
      new FakeSmokeOrderRepository(),
      UnroutedShardScopes.create(),
    );

    await cache.invalidate(TENANT);

    expect(aside.invalidated).toEqual([[TENANT, 'orders']]);
  });
});
