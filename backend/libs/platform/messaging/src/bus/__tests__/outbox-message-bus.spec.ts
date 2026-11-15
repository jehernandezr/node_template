import {
  defineCommand,
  defineEvent,
  defineQueue,
  defineServiceContract,
  defineTopic,
} from '@contracts/platform';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { z } from 'zod';
import {
  EnvelopeBuilder,
  InMemoryOutboxStore,
  InMemoryTransactionManager,
} from '../../__tests__/utils/index.js';
import type {
  OutboundTarget,
  PublishOutboxOptions,
} from '../../outbox/outbox.js';
import { OutboxStatus } from '../../outbox/outbox.js';
import { OutboxRelay } from '../../outbox/outbox-relay.js';
import { topologyFromContracts } from '../../topology/contract-topology.js';
import { TargetKind } from '../../topology/target-kind.enum.js';
import { OutboxMessageBus } from '../outbox-message-bus.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { type EnvelopePublisher } from '../../outbox/envelope-publisher.js';
import { CommitCounter } from './utils/commit-counter.js';

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
  const transactions = new InMemoryTransactionManager();
  const store = new InMemoryOutboxStore({ clock, transactions });
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
    retryPolicy: new RetryPolicy(10, 1_000, 60_000, BackoffStrategy.None),
    clock,
    ids: new SequentialIdGenerator(),
  });
  const commits = new CommitCounter();
  const bus = new OutboxMessageBus({
    topology,
    writer: store,
    transactions,
    source: '/services/orders',
    clock,
    ids: new SequentialIdGenerator(),
    traceparent: () => undefined,
    onCommitted: async () => {
      commits.notify();
      await relay.relayOnce();
    },
  });
  return {
    bus,
    store,
    relay,
    transactions,
    published,
    commits,
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
    ).rejects.toMatchObject({
      code: MessagingErrorCode.TransactionRequired,
    });
    expect(store.get('00000000-0000-7000-8000-000000000001')).toBeUndefined();
  });

  it('writes the envelope with the transaction and publishes it after the commit', async () => {
    const { bus, store, transactions, published, commits } = setup();

    const envelope = await transactions.runInTransaction(async () => {
      const placed = await bus.publish(
        OrderPlaced,
        { orderId: 'o-1', total: 10 },
        { groupId: 'o-1' },
      );
      await bus.send(ExpireOrder, { orderId: 'o-1' }, { delayMs: 60_000 });
      // Nada se publica mientras la transacción sigue abierta.
      expect(published).toEqual([]);
      return placed;
    });

    expect(commits.count).toBe(1);
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

  it('notifies the commit once when a transaction appends several messages', async () => {
    const { bus, transactions, commits } = setup();

    await transactions.runInTransaction(async () => {
      await bus.publish(
        OrderPlaced,
        { orderId: 'o-1', total: 10 },
        { groupId: 'o-1' },
      );
      await bus.publish(
        OrderPlaced,
        { orderId: 'o-2', total: 20 },
        { groupId: 'o-2' },
      );
    });

    expect(commits.count).toBe(1);
  });

  it('drops the record and skips the commit notice when the transaction rolls back', async () => {
    const { bus, store, transactions, commits } = setup();
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
    expect(commits.count).toBe(0);
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
      ).rejects.toMatchObject({
        code: MessagingErrorCode.InvalidPayload,
      });
      await expect(
        bus.publish(OrderPlaced, { orderId: 'o-1', total: 10 }),
      ).rejects.toMatchObject({
        code: MessagingErrorCode.InvalidOptions,
      });
    });
  });
});

describe('OutboxRelay with contracts', () => {
  it('marks a record whose payload breaks the contract Dead without publishing it', async () => {
    const { store, relay, published } = setup();
    store.add(
      EnvelopeBuilder.anEnvelope({
        id: 'bad',
        type: OrderPlaced.type,
        source: '/test',
        data: { orderId: 'o-1', total: 'ten' },
      }),
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
      EnvelopeBuilder.anEnvelope({
        id: 'nogroup',
        type: OrderPlaced.type,
        source: '/test',
        data: { orderId: 'o-1', total: 10 },
      }),
    );
    expect(await relay.relayOnce()).toMatchObject({ dead: 1 });
  });

  it('passes only what is left of a command delay', async () => {
    const { store, relay, published, clock } = setup();
    store.add(
      EnvelopeBuilder.anEnvelope({
        id: 'late',
        type: ExpireOrder.type,
        source: '/test',
        data: { orderId: 'o-1' },
      }),
      { delayMs: 60_000, now: t0 },
    );
    clock.advance(45_000);
    await relay.relayOnce();
    expect(published[0]?.options).toEqual({ delayMs: 15_000 });
  });
});
