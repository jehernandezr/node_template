import { AsyncLocalStorage } from 'node:async_hooks';
import {
  defineCommand,
  defineEvent,
  defineQueue,
  defineServiceContract,
  defineTopic,
} from '@contracts/platform';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import type {
  SqlSession,
  TransactionHook,
  TransactionManager,
  UnitOfWork,
} from '@platform/persistence';
import { z } from 'zod';
import { createEnvelope } from '../envelope/message-envelope.js';
import { MessagingErrorCode } from '../errors/messaging-error.js';
import { InMemoryOutboxStore } from '../outbox/in-memory-outbox-store.js';
import type {
  EnvelopePublisher,
  OutboundTarget,
  PublishOutboxOptions,
} from '../outbox/outbox.js';
import { OutboxStatus } from '../outbox/outbox.js';
import { OutboxRelay } from '../outbox/outbox-relay.js';
import { topologyFromContracts } from '../topology/contract-topology.js';
import { TargetKind } from '../topology/route.js';
import { OutboxMessageBus } from './outbox-message-bus.js';

/** Unidad de trabajo en memoria con los ganchos de `@platform/persistence`. */
class FakeTransactions implements TransactionManager {
  private readonly storage = new AsyncLocalStorage<FakeUnitOfWork>();

  async runInTransaction<T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    const open = this.storage.getStore();
    if (open) return fn(open);
    const uow = new FakeUnitOfWork();
    let result: T;
    try {
      result = await this.storage.run(uow, () => fn(uow));
    } catch (err) {
      for (const hook of uow.rollbackHooks) await hook();
      throw err;
    }
    for (const hook of uow.commitHooks) await hook();
    return result;
  }

  current(): UnitOfWork | undefined {
    return this.storage.getStore();
  }

  isInTransaction(): boolean {
    return this.current() !== undefined;
  }

  afterCommit(hook: TransactionHook): void {
    const uow = this.storage.getStore();
    if (uow) uow.afterCommit(hook);
    else void hook();
  }
}

class FakeUnitOfWork implements UnitOfWork {
  readonly database = 'shard-1';
  readonly session: SqlSession = {
    query: () => Promise.resolve({ rows: [], rowCount: 0 }),
  };
  readonly commitHooks: TransactionHook[] = [];
  readonly rollbackHooks: TransactionHook[] = [];

  afterCommit(hook: TransactionHook): void {
    this.commitHooks.push(hook);
  }

  afterRollback(hook: TransactionHook): void {
    this.rollbackHooks.push(hook);
  }
}

const OrderPlaced = defineEvent({
  type: 'orders.order.placed.v1',
  payload: z.object({ orderId: z.string(), total: z.number().positive() }),
  description: 'Se creó un pedido.',
});
const OrdersEvents = defineTopic({
  name: 'orders-events',
  fifo: true,
  events: [OrderPlaced],
  description: 'Eventos de pedidos, en orden por pedido.',
});
const ExpireOrder = defineCommand({
  type: 'orders.order.expire.v1',
  payload: z.object({ orderId: z.string() }),
  description: 'Vence un pedido sin pagar.',
});
const orders = defineServiceContract({
  service: 'orders',
  description: 'Pedidos.',
  events: { orderPlaced: OrderPlaced },
  commands: { expireOrder: ExpireOrder },
  topics: { ordersEvents: OrdersEvents },
  queues: {
    ordersProjection: defineQueue({
      name: 'orders-projection',
      fifo: true,
      subscriptions: [{ topic: OrdersEvents }],
      description: 'Proyección de pedidos.',
    }),
    ordersWork: defineQueue({
      name: 'orders-work',
      commands: [ExpireOrder],
      description: 'Trabajo diferido de pedidos.',
    }),
  },
});

const t0 = new Date('2026-01-01T00:00:00.000Z');

interface Published {
  readonly id: string;
  readonly target: OutboundTarget;
  readonly options: PublishOutboxOptions;
}

function setup() {
  const clock = new FixedClock(t0);
  const topology = topologyFromContracts([orders]);
  const store = new InMemoryOutboxStore({ clock });
  const transactions = new FakeTransactions();
  const published: Published[] = [];
  const publisher: EnvelopePublisher = {
    publish: (envelope, target, options) => {
      published.push({ id: envelope.id, target, options });
      return Promise.resolve();
    },
  };
  const relay = new OutboxRelay({
    store,
    publisher,
    topology,
    backoff: { baseMs: 1_000, maxMs: 60_000, jitter: false },
    clock,
    ids: new SequentialIdGenerator(),
  });
  const onCommitted = jest.fn(() => relay.relayOnce().then(() => undefined));
  const bus = new OutboxMessageBus({
    topology,
    writer: store,
    transactions,
    source: '/services/orders',
    clock,
    ids: new SequentialIdGenerator(),
    traceparent: () => undefined,
    onCommitted,
  });
  return {
    bus,
    store,
    relay,
    transactions,
    published,
    onCommitted,
    clock,
    topology,
  };
}

describe('OutboxMessageBus', () => {
  it('refuses to publish outside a transaction', async () => {
    const { bus, store } = setup();
    await expect(
      bus.publish(
        OrderPlaced,
        { orderId: 'o-1', total: 10 },
        { groupId: 'o-1' },
      ),
    ).rejects.toMatchObject({ code: MessagingErrorCode.TransactionRequired });
    expect(store.get('00000000-0000-7000-8000-000000000001')).toBeUndefined();
  });

  it('writes the envelope with the transaction and publishes it after the commit', async () => {
    const { bus, store, transactions, published, onCommitted } = setup();

    const envelope = await transactions.runInTransaction(async () => {
      const placed = await bus.publish(
        OrderPlaced,
        { orderId: 'o-1', total: 10 },
        { groupId: 'o-1' },
      );
      await bus.send(ExpireOrder, { orderId: 'o-1' }, { delayMs: 60_000 });
      // Nothing is published while the transaction is open.
      expect(published).toEqual([]);
      return placed;
    });

    expect(onCommitted).toHaveBeenCalledTimes(1);
    expect(store.get(envelope.id)).toMatchObject({
      status: OutboxStatus.Published,
      groupId: 'o-1',
    });
    expect(published).toEqual([
      {
        id: envelope.id,
        target: { kind: TargetKind.Topic, name: 'orders-events', fifo: true },
        options: { groupId: 'o-1' },
      },
      {
        id: expect.any(String),
        target: { kind: TargetKind.Queue, name: 'orders-work', fifo: false },
        options: { delayMs: 60_000 },
      },
    ]);
  });

  it('drops the record when the transaction rolls back', async () => {
    const { bus, store, transactions, onCommitted } = setup();
    let id = '';
    await expect(
      transactions.runInTransaction(async () => {
        const envelope = await bus.publish(
          OrderPlaced,
          { orderId: 'o-1', total: 10 },
          { groupId: 'o-1' },
        );
        id = envelope.id;
        throw new Error('business rule failed');
      }),
    ).rejects.toThrow('business rule failed');

    expect(store.get(id)).toBeUndefined();
    expect(onCommitted).not.toHaveBeenCalled();
  });

  it('validates the payload and the FIFO group before writing', async () => {
    const { bus, transactions } = setup();
    await transactions.runInTransaction(async () => {
      await expect(
        bus.publish(
          OrderPlaced,
          { orderId: 'o-1', total: -1 },
          { groupId: 'o-1' },
        ),
      ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidPayload });
      await expect(
        bus.publish(OrderPlaced, { orderId: 'o-1', total: 10 }),
      ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidOptions });
    });
  });
});

describe('OutboxRelay with contracts', () => {
  it('marks a record whose payload breaks the contract Dead without publishing it', async () => {
    const { store, relay, published } = setup();
    store.add(
      createEnvelope(
        {
          type: OrderPlaced.type,
          source: '/test',
          data: { orderId: 'o-1', total: 'ten' },
        },
        { newId: () => 'bad', now: () => t0 },
      ),
      { groupId: 'o-1' },
    );

    expect(await relay.relayOnce()).toMatchObject({ dead: 1, published: 0 });
    expect(store.get('bad')).toMatchObject({
      status: OutboxStatus.Dead,
      lastError: expect.stringContaining('invalid payload'),
    });
    expect(published).toEqual([]);
  });

  it('marks a FIFO record without groupId Dead', async () => {
    const { store, relay } = setup();
    store.add(
      createEnvelope(
        {
          type: OrderPlaced.type,
          source: '/test',
          data: { orderId: 'o-1', total: 10 },
        },
        { newId: () => 'nogroup', now: () => t0 },
      ),
    );
    expect(await relay.relayOnce()).toMatchObject({ dead: 1 });
  });

  it('passes only what is left of a command delay', async () => {
    const { store, relay, published, clock } = setup();
    store.add(
      createEnvelope(
        {
          type: ExpireOrder.type,
          source: '/test',
          data: { orderId: 'o-1' },
        },
        { newId: () => 'late', now: () => t0 },
      ),
      { delayMs: 60_000, now: t0 },
    );
    clock.advance(45_000);
    await relay.relayOnce();
    expect(published[0]?.options).toEqual({ delayMs: 15_000 });
  });
});
