import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import { BackoffStrategy } from '@platform/primitives';
import { createEnvelope } from '../envelope/message-envelope.js';
import { MessagingErrorCode } from '../errors/messaging-error.js';
import { QueueDef } from '../topology/queue-def.js';
import { Route } from '../topology/route.js';
import { TopicDef } from '../topology/topic-def.js';
import { Topology } from '../topology/topology.js';
import { InMemoryOutboxStore } from './in-memory-outbox-store.js';
import type { EnvelopePublisher } from './outbox.js';
import { OutboxStatus } from './outbox.js';
import { OutboxRelay, type OutboxRelayOptions } from './outbox-relay.js';

const events = new TopicDef('orders-events');

class TestTopology extends Topology {
  readonly topics = [events];
  readonly queues = [
    new QueueDef('billing')
      .subscribesTo(events)
      .deadLetter({ maxReceiveCount: 5 }),
  ];
  readonly routes = [Route.event('orders.order.changed.v1').to(events)];
}

const t0 = new Date('2026-01-01T00:00:00.000Z');
const at = (ms: number) => new Date(t0.getTime() + ms);

/** Lets pending promise callbacks run. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function envelope(id: string) {
  return createEnvelope(
    { type: 'orders.order.changed.v1', source: '/test', data: { id } },
    { newId: () => id, now: () => t0 },
  );
}

function setup() {
  const clock = new FixedClock(t0);
  const ids = new SequentialIdGenerator(t0);
  const store = new InMemoryOutboxStore({ clock });
  const published: string[] = [];
  const failing = new Set<string>();
  const publisher: EnvelopePublisher = {
    publish: (message) => {
      if (failing.has(message.id))
        return Promise.reject(
          Object.assign(new Error(`broker rejected ${message.id}`), {
            retryable: true,
          }),
        );
      published.push(message.id);
      return Promise.resolve();
    },
  };
  const relay = (extra: Partial<OutboxRelayOptions> = {}) =>
    new OutboxRelay({
      store,
      publisher,
      topology: new TestTopology(),
      backoff: {
        strategy: BackoffStrategy.None,
        baseMs: 1_000,
        maxMs: 60_000,
      },
      clock,
      ids,
      ...extra,
    });
  return { clock, store, published, failing, relay };
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
    const claim = jest.spyOn(store, 'claimPending');
    const instance = relay();
    await instance.relayOnce();
    await instance.relayOnce();

    const [first, second] = claim.mock.calls.map(([request]) => request.lease);
    expect(first?.owner).toBe(instance.ownerId);
    expect(second?.owner).toBe(instance.ownerId);
    expect(first?.token).not.toBe(second?.token);
  });

  it('a stale owner cannot mark a record another relay took over', async () => {
    const { clock, store, published, relay } = setup();
    store.add(envelope('m1'));

    // Relay A leases m1, then stalls inside publish past its lease.
    let release = (): void => undefined;
    const stalled = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slowPublisher: EnvelopePublisher = {
      publish: () => stalled,
    };
    const a = relay({ publisher: slowPublisher, leaseMs: 1_000 });
    const passA = a.relayOnce();
    await flush();

    clock.advance(5_000);
    const b = relay({ leaseMs: 1_000 });
    expect(await b.relayOnce()).toMatchObject({ claimed: 1, published: 1 });
    expect(published).toEqual(['m1']);

    release();
    expect(await passA).toMatchObject({ published: 0, stale: 1 });
    expect(store.get('m1')).toMatchObject({
      status: OutboxStatus.Published,
      attempts: 1,
    });
  });

  it('does not publish a record whose lease already expired', async () => {
    const { clock, store, published, relay } = setup();
    store.add(envelope('m1'));
    store.add(envelope('m2'));
    // The first publish is slow enough to outlive the lease of the second record.
    const slowFirst: EnvelopePublisher = {
      publish: (message) => {
        if (message.id === 'm1') clock.advance(2_000);
        published.push(message.id);
        return Promise.resolve();
      },
    };

    const report = await relay({
      publisher: slowFirst,
      leaseMs: 1_000,
    }).relayOnce();
    expect(published).toEqual(['m1']);
    expect(report).toMatchObject({ claimed: 2, published: 1, stale: 1 });
    expect(store.get('m2')?.status).toBe(OutboxStatus.Pending);
  });

  it('rejects invalid options', () => {
    const { relay } = setup();
    expect(() => relay({ leaseMs: 0 })).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidOptions }),
    );
    expect(() => relay({ batchSize: 1.5 })).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidOptions }),
    );
  });
});

describe('OutboxRelay FIFO per groupId', () => {
  it('does not publish later records of a group after one fails, in that pass or the next', async () => {
    const { clock, store, published, failing, relay } = setup();
    store.add(envelope('a1'), { now: at(0), groupId: 'order-1' });
    store.add(envelope('a2'), { now: at(1), groupId: 'order-1' });
    store.add(envelope('b1'), { now: at(2), groupId: 'order-2' });
    store.add(envelope('free'), { now: at(3) });
    failing.add('a1');
    clock.set(at(10));
    const instance = relay();

    expect(await instance.relayOnce()).toEqual({
      claimed: 4,
      published: 2,
      failed: 1,
      dead: 0,
      deferred: 1,
      stale: 0,
    });
    expect(published).toEqual(['b1', 'free']);
    expect(store.get('a2')).toMatchObject({
      status: OutboxStatus.Pending,
      attempts: 0,
      leaseOwner: undefined,
    });

    // a2 is due, but a1 is not: the group waits.
    clock.advance(500);
    expect(await instance.relayOnce()).toMatchObject({
      claimed: 0,
      published: 0,
    });

    failing.delete('a1');
    clock.advance(1_000);
    expect(await instance.relayOnce()).toMatchObject({
      claimed: 2,
      published: 2,
    });
    expect(published).toEqual(['b1', 'free', 'a1', 'a2']);
  });

  it('lets a group continue after its head goes Dead', async () => {
    const { store, published, failing, relay } = setup();
    store.add(envelope('a1'), { now: at(0), groupId: 'order-1' });
    store.add(envelope('a2'), { now: at(1), groupId: 'order-1' });
    failing.add('a1');

    expect(await relay({ maxAttempts: 1 }).relayOnce(at(10))).toMatchObject({
      published: 1,
      dead: 1,
      deferred: 0,
    });
    expect(published).toEqual(['a2']);
    expect(store.get('a1')?.status).toBe(OutboxStatus.Dead);
  });

  it('blocks the group of a record whose mark was rejected', async () => {
    const { clock, store, published, relay } = setup();
    store.add(envelope('a1'), { now: at(0), groupId: 'order-1' });
    store.add(envelope('a2'), { now: at(1), groupId: 'order-1' });
    clock.set(at(10));
    jest.spyOn(store, 'markPublished').mockResolvedValueOnce(false);

    expect(await relay().relayOnce()).toMatchObject({
      published: 0,
      stale: 1,
      deferred: 1,
    });
    expect(published).toEqual(['a1']);
  });
});
