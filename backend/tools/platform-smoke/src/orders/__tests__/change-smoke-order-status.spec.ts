import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import { FakeSmokeOrderRepository } from '../../__tests__/utils/fake-smoke-order-repository.js';
import { RecordingCacheAside } from '../../__tests__/utils/recording-cache-aside.js';
import { ChangeSmokeOrderStatus } from '../change-smoke-order-status.js';
import { SmokeOrder } from '../smoke-order.js';
import { SmokeOrderCache } from '../smoke-order-cache.js';
import { SmokeOrderStatus } from '../smoke-order-status.enum.js';

const TENANT = '0193f1c2-0000-7000-8000-0000000000a1';

describe('ChangeSmokeOrderStatus', () => {
  it('invalidates the tenant cache only after the commit', async () => {
    const transactions = new InMemoryTransactionManager();
    const orders = new FakeSmokeOrderRepository();
    orders.rows.set(
      'o-1',
      new SmokeOrder('o-1', 'Ana', SmokeOrderStatus.Placed, 1),
    );
    const aside = new RecordingCacheAside();
    const useCase = new ChangeSmokeOrderStatus(
      transactions,
      orders,
      new SmokeOrderCache(
        aside.asCacheAside(),
        orders,
        UnroutedShardScopes.create(),
      ),
      UnroutedShardScopes.create(),
    );

    await useCase.execute({
      tenantId: TENANT,
      orderId: 'o-1',
      status: SmokeOrderStatus.Paid,
    });

    expect(orders.rows.get('o-1')?.status).toBe(SmokeOrderStatus.Paid);
    expect(aside.invalidated).toEqual([[TENANT, 'orders']]);
  });

  it('does nothing when the order does not exist', async () => {
    const transactions = new InMemoryTransactionManager();
    const orders = new FakeSmokeOrderRepository();
    const aside = new RecordingCacheAside();
    const useCase = new ChangeSmokeOrderStatus(
      transactions,
      orders,
      new SmokeOrderCache(
        aside.asCacheAside(),
        orders,
        UnroutedShardScopes.create(),
      ),
      UnroutedShardScopes.create(),
    );

    await useCase.execute({
      tenantId: TENANT,
      orderId: 'missing',
      status: SmokeOrderStatus.Paid,
    });

    expect(aside.invalidated).toEqual([]);
  });
});
