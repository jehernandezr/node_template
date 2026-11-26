import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { EnvelopeFactory, OutboxStatus } from '@platform/messaging';
import {
  InMemoryOutboxStore,
  InMemoryTransactionManager,
} from '@platform/messaging/test-utils';
import { FakeSmokeOrderRepository } from '../../__tests__/utils/fake-smoke-order-repository.js';
import { RegisterSmokeOrder } from '../register-smoke-order.js';
import { SmokeOrderCreated } from '../smoke-order-events.js';
import { SmokeOrderStatus } from '../smoke-order-status.enum.js';
import { SmokeService } from '../../smoke-service.enum.js';

const TENANT = '0193f1c2-0000-7000-8000-0000000000a1';

describe('RegisterSmokeOrder', () => {
  function setup() {
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const ids = new SequentialIdGenerator();
    const transactions = new InMemoryTransactionManager();
    const outbox = new InMemoryOutboxStore({ clock, transactions });
    const orders = new FakeSmokeOrderRepository();
    const useCase = new RegisterSmokeOrder(
      transactions,
      orders,
      outbox,
      new EnvelopeFactory(clock, ids),
      ids,
      clock,
      UnroutedShardScopes.create(),
    );
    return { useCase, orders, outbox, clock };
  }

  it('stores the order and writes its event to the outbox in the same unit of work', async () => {
    const { useCase, orders, outbox } = setup();

    const order = await useCase.execute({ tenantId: TENANT, customer: 'Ana' });

    expect(order.status).toBe(SmokeOrderStatus.Placed);
    expect(orders.rows.get(order.id)?.customer).toBe('Ana');
    const pending = await outbox.claimPending({
      now: new Date('2026-01-01T00:00:01.000Z'),
      limit: 10,
      lease: { owner: 'test', token: 'token' },
      leaseMs: 30_000,
    });
    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe(OutboxStatus.Pending);
    expect(pending[0]?.envelope).toMatchObject({
      type: SmokeOrderCreated.type,
      source: SmokeService.Name,
      tenantid: TENANT,
      data: { orderId: order.id, customer: 'Ana' },
    });
  });

  it('leaves no outbox record when the order cannot be stored', async () => {
    const { useCase, orders, outbox } = setup();
    orders.failNextSave = true;

    await expect(
      useCase.execute({ tenantId: TENANT, customer: 'Ana' }),
    ).rejects.toThrow('the row does not fit');

    const pending = await outbox.claimPending({
      now: new Date('2026-01-01T00:00:01.000Z'),
      limit: 10,
      lease: { owner: 'test', token: 'token' },
      leaseMs: 30_000,
    });
    expect(pending).toHaveLength(0);
  });
});
