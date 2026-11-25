import { SystemRandomSource } from '@platform/kernel';
import { defineEvent } from '@contracts/platform';
import { z } from 'zod';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { QueueDef } from '../../topology/queue-def.js';
import { Route } from '../../topology/route.js';
import { TopicDef } from '../../topology/topic-def.js';
import { Topology } from '../../topology/topology.js';
import {
  OutboxStatus,
  type OutboundTarget,
  type PublishOutboxOptions,
} from '../outbox.js';
import { OutboxRelay, type OutboxRelayOptions } from '../outbox-relay.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { type EnvelopePublisher } from '../envelope-publisher.js';
import type { MessageEnvelope } from '../../envelope/message-envelope.js';
import {
  EnvelopeBuilder,
  RecordingEnvelopePublisher,
} from '../../__tests__/utils/index.js';
import { RecordingOutboxStore } from './utils/recording-outbox-store.js';

const events = new TopicDef('orders-events');

const OrderChanged = defineEvent({
  type: 'orders.order.changed.v1',
  payload: z.object({ id: z.string() }),
  description: 'Test event.',
});

function testTopology(): Topology {
  const topics = [events];
  const queues = [
    new QueueDef('billing')
      .subscribesTo(events)
      .deadLetter({ maxReceiveCount: 5 }),
  ];
  const routes = [Route.event(OrderChanged).to(events)];
  return new Topology({ topics, queues, routes });
}

const t0 = new Date('2026-01-01T00:00:00.000Z');
const at = (ms: number) => new Date(t0.getTime() + ms);

/** Lets pending promises run. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function envelope(id: string): MessageEnvelope {
  return EnvelopeBuilder.anEnvelope({
    id,
    type: 'orders.order.changed.v1',
    source: '/test',
    data: { id },
  });
}

/** Publisher that advances the clock when publishing the first envelope, as if it were slow. */
class SlowFirstPublisher extends RecordingEnvelopePublisher {
  constructor(private readonly clock: FixedClock) {
    super();
  }

  override publish(
    sent: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions,
  ): Promise<void> {
    if (sent.id === 'm1') this.clock.advance(2_000);
    return super.publish(sent, target, options);
  }
}

function setup() {
  const clock = new FixedClock(t0);
  const ids = new SequentialIdGenerator(t0);
  const store = new RecordingOutboxStore(clock);
  const publisher = new RecordingEnvelopePublisher();
  const relay = (extra: Partial<OutboxRelayOptions> = {}) =>
    new OutboxRelay({
      random: new SystemRandomSource(),
      store,
      publisher,
      topology: testTopology(),
      retryPolicy: new RetryPolicy(10, 1_000, 60_000, BackoffStrategy.None),
      clock,
      ids,
      ...extra,
    });
  return { clock, store, publisher, relay };
}

describe('OutboxRelay fencing', () => {
  it('gives every instance its own owner id', () => {
    const { relay } = setup();
    const a = relay();
    const b = relay();
    expect(a.ownerId).not.toBe(b.ownerId);
    expect(a.ownerId).toMatch(/^outbox-relay:/);
    expect(relay({ owner: 'orders' }).ownerId).toMatch(/^orders:/);
  });

  it('leases records with the instance owner and a fresh token per pass', async () => {
    const { store, relay } = setup();
    store.add(envelope('m1'));
    const instance = relay();
    await instance.relayOnce();
    await instance.relayOnce();

    const [first, second] = store.claims.map((request) => request.lease);
    expect(first?.owner).toBe(instance.ownerId);
    expect(second?.owner).toBe(instance.ownerId);
    expect(first?.token).not.toBe(second?.token);
  });

  it('gives two relays distinct owners, and each pass its own token', async () => {
    const { store, relay } = setup();
    store.add(envelope('m1'));
    const a = relay();
    const b = relay();
    await a.relayOnce();
    await b.relayOnce();

    const [first, second] = store.claims.map((request) => request.lease);
    expect(first?.owner).not.toBe(second?.owner);
    expect(first?.token).not.toBe(second?.token);
  });

  it('a stale owner cannot mark a record another relay took over', async () => {
    const { clock, store, publisher, relay } = setup();
    store.add(envelope('m1'));

    // Relay A takes m1 and stays in publish beyond its lease.
    let release = (): void => undefined;
    const stalled = new Promise<void>((resolve) => {
      release = resolve;
    });
    const stallingPublisher: EnvelopePublisher = {
      publish: () => stalled,
    };
    const a = relay({ publisher: stallingPublisher, leaseMs: 1_000 });
    const passA = a.relayOnce();
    await flush();

    clock.advance(5_000);
    const b = relay({ leaseMs: 1_000 });
    expect(await b.relayOnce()).toMatchObject({ claimed: 1, published: 1 });
    expect(publisher.published.map((p) => p.envelope.id)).toEqual(['m1']);

    release();
    expect(await passA).toMatchObject({ published: 0, stale: 1 });
    expect(store.get('m1')).toMatchObject({
      status: OutboxStatus.Published,
      attempts: 1,
    });
  });

  it('does not publish a record whose lease already expired', async () => {
    const { clock, store, relay } = setup();
    store.add(envelope('m1'));
    store.add(envelope('m2'));
    // The first publication takes longer than the lease of the second record.
    const slowFirst = new SlowFirstPublisher(clock);

    const report = await relay({
      publisher: slowFirst,
      leaseMs: 1_000,
    }).relayOnce();
    expect(slowFirst.published.map((p) => p.envelope.id)).toEqual(['m1']);
    expect(report).toMatchObject({ claimed: 2, published: 1, stale: 1 });
    expect(store.get('m2')?.status).toBe(OutboxStatus.Pending);
  });

  it('rejects invalid options', () => {
    const { relay } = setup();
    expect(() => relay({ leaseMs: 0 })).toThrow(
      expect.objectContaining({
        code: MessagingErrorCode.InvalidOptions,
      }),
    );
    expect(() => relay({ batchSize: 1.5 })).toThrow(
      expect.objectContaining({
        code: MessagingErrorCode.InvalidOptions,
      }),
    );
  });
});

describe('OutboxRelay FIFO per groupId', () => {
  it('does not publish later records of a group after one fails, in that pass or the next', async () => {
    const { clock, store, publisher, relay } = setup();
    store.add(envelope('a1'), { now: at(0), groupId: 'order-1' });
    store.add(envelope('a2'), { now: at(1), groupId: 'order-1' });
    store.add(envelope('b1'), { now: at(2), groupId: 'order-2' });
    store.add(envelope('free'), { now: at(3) });
    publisher.failing.add('a1');
    clock.set(at(10));
    const instance = relay();
    const ids = () => publisher.published.map((p) => p.envelope.id);

    expect(await instance.relayOnce()).toEqual({
      claimed: 4,
      published: 2,
      failed: 1,
      dead: 0,
      deferred: 1,
      stale: 0,
    });
    expect(ids()).toEqual(['b1', 'free']);
    expect(store.get('a2')).toMatchObject({
      status: OutboxStatus.Pending,
      attempts: 0,
      leaseOwner: undefined,
    });

    // a2 expires, but a1 does not: the group waits.
    clock.advance(500);
    expect(await instance.relayOnce()).toMatchObject({
      claimed: 0,
      published: 0,
    });

    publisher.failing.delete('a1');
    clock.advance(1_000);
    expect(await instance.relayOnce()).toMatchObject({
      claimed: 2,
      published: 2,
    });
    expect(ids()).toEqual(['b1', 'free', 'a1', 'a2']);
  });

  it('holds a group behind its head while the transport is down and keeps its order when it comes back', async () => {
    const { store, publisher, relay, clock } = setup();
    store.add(envelope('a1'), { now: at(0), groupId: 'order-1' });
    store.add(envelope('a2'), { now: at(1), groupId: 'order-1' });
    publisher.failing.add('a1');
    clock.set(at(10));
    const instance = relay({
      retryPolicy: new RetryPolicy(1, 1_000, 60_000, BackoffStrategy.None),
    });

    expect(await instance.relayOnce()).toMatchObject({
      published: 0,
      failed: 1,
      dead: 0,
      deferred: 1,
    });
    publisher.failing.delete('a1');
    clock.set(at(120_000));
    await instance.relayOnce();

    expect(publisher.published.map((p) => p.envelope.id)).toEqual(['a1', 'a2']);
  });

  it('blocks the group of a record whose mark was rejected', async () => {
    const { clock, store, publisher, relay } = setup();
    store.add(envelope('a1'), { now: at(0), groupId: 'order-1' });
    store.add(envelope('a2'), { now: at(1), groupId: 'order-1' });
    clock.set(at(10));
    store.rejectNextPublishedMarks(1);

    expect(await relay().relayOnce()).toMatchObject({
      published: 0,
      stale: 1,
      deferred: 1,
    });
    expect(publisher.published.map((p) => p.envelope.id)).toEqual(['a1']);
  });
});
