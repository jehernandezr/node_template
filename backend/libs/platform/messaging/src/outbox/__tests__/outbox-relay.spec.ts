import { FixedClock, FixedRandomSource } from '@platform/kernel/test-utils';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { defineEvent } from '@contracts/platform';
import { z } from 'zod';
import { QueueDef } from '../../topology/queue-def.js';
import { Route } from '../../topology/route.js';
import { TopicDef } from '../../topology/topic-def.js';
import { Topology } from '../../topology/topology.js';
import type { OutboxLease } from '../outbox.js';
import { OutboxStatus } from '../outbox.js';
import {
  EnvelopeBuilder,
  InMemoryOutboxStore,
  RecordingEnvelopePublisher,
} from '../../__tests__/utils/index.js';
import { CircuitOpenError } from '@platform/resilience';
import { OutboxRelay, type OutboxRelayOptions } from '../outbox-relay.js';
import { EnvelopeLimits } from '../../envelope/envelope-limits.js';
import type { MessageEnvelope } from '../../envelope/message-envelope.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import type { OutboundTarget, PublishOutboxOptions } from '../outbox.js';

const events = new TopicDef('tasks-events');

const TaskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: z.object({ id: z.string() }),
  description: 'Test event.',
});

function testTopology(): Topology {
  const topics = [events];
  const queues = [
    new QueueDef('notifications')
      .subscribesTo(events)
      .deadLetter({ maxReceiveCount: 5 }),
  ];
  const routes = [Route.event(TaskUpdated).to(events)];
  return new Topology({ topics, queues, routes });
}

const t0 = new Date('2026-01-01T00:00:00.000Z');
const at = (ms: number) => new Date(t0.getTime() + ms);
const NO_JITTER_POLICY = new RetryPolicy(
  10,
  1_000,
  60_000,
  BackoffStrategy.None,
);

const NO_RECORDS = {
  claimed: 0,
  published: 0,
  failed: 0,
  dead: 0,
  deferred: 0,
  stale: 0,
};

function envelope(
  id: string,
  type = 'tasks.task.updated.v1',
  data: unknown = { id },
) {
  return EnvelopeBuilder.anEnvelope({ id, type, source: '/test', data });
}

interface Setup {
  readonly clock: FixedClock;
  readonly store: InMemoryOutboxStore;
  readonly publisher: RecordingEnvelopePublisher;
  readonly relay: (extra?: Partial<OutboxRelayOptions>) => OutboxRelay;
}

function setup(): Setup {
  const clock = new FixedClock(t0);
  const store = new InMemoryOutboxStore({ clock });
  const publisher = new RecordingEnvelopePublisher();
  const relay = (extra: Partial<OutboxRelayOptions> = {}) =>
    new OutboxRelay({
      store,
      publisher,
      topology: testTopology(),
      retryPolicy: NO_JITTER_POLICY,
      clock,
      ...extra,
    });
  return { clock, store, publisher, relay };
}

describe('OutboxRelay', () => {
  it('publishes due records to the topic from the topology, passing the groupId', async () => {
    const { store, publisher, relay } = setup();
    store.add(envelope('m1'), { now: t0, groupId: 'order-1' });
    store.add(envelope('m2'), { now: t0 });

    expect(await relay().relayOnce()).toEqual({
      ...NO_RECORDS,
      claimed: 2,
      published: 2,
    });
    expect(publisher.published).toEqual([
      {
        envelope: expect.objectContaining({ id: 'm1' }),
        target: { kind: 'topic', name: 'tasks-events', fifo: false },
        options: { groupId: 'order-1' },
      },
      {
        envelope: expect.objectContaining({ id: 'm2' }),
        target: { kind: 'topic', name: 'tasks-events', fifo: false },
        options: { groupId: undefined },
      },
    ]);
    expect(store.get('m1')?.status).toBe(OutboxStatus.Published);
    expect(await relay().relayOnce()).toEqual(NO_RECORDS);
  });

  it('marks each record published right after its own publish, not in one batch at the end', async () => {
    class LoggingStore extends InMemoryOutboxStore {
      readonly log: string[] = [];

      override markPublished(id: string, lease: OutboxLease): Promise<boolean> {
        this.log.push(`mark:${id}`);
        return super.markPublished(id, lease);
      }
    }
    class LoggingPublisher extends RecordingEnvelopePublisher {
      constructor(private readonly store: LoggingStore) {
        super();
      }

      override publish(
        envelope: MessageEnvelope,
        target: OutboundTarget,
        options: PublishOutboxOptions,
      ): Promise<void> {
        this.store.log.push(`publish:${envelope.id}`);
        return super.publish(envelope, target, options);
      }
    }
    const clock = new FixedClock(t0);
    const store = new LoggingStore({ clock });
    const publisher = new LoggingPublisher(store);
    store.add(envelope('m1'), { now: t0 });
    store.add(envelope('m2'), { now: t0 });
    const relay = new OutboxRelay({
      store,
      publisher,
      topology: testTopology(),
      retryPolicy: NO_JITTER_POLICY,
      clock,
    });

    await relay.relayOnce();
    expect(store.log).toEqual([
      'publish:m1',
      'mark:m1',
      'publish:m2',
      'mark:m2',
    ]);
  });

  it('schedules failed records with exponential backoff and retries them when due', async () => {
    const { clock, store, publisher, relay } = setup();
    store.add(envelope('m1'), { now: t0 });
    publisher.failing.add('m1');
    const instance = relay();

    expect(await instance.relayOnce()).toEqual({
      ...NO_RECORDS,
      claimed: 1,
      failed: 1,
    });
    expect(store.get('m1')).toMatchObject({
      status: OutboxStatus.Failed,
      attempts: 1,
      lastError: 'transport down',
      nextAttemptAt: at(1_000),
    });

    // Not due yet.
    clock.set(at(999));
    expect(await instance.relayOnce()).toEqual(NO_RECORDS);

    // The second failure doubles the wait.
    clock.set(at(1_000));
    expect(await instance.relayOnce()).toEqual({
      ...NO_RECORDS,
      claimed: 1,
      failed: 1,
    });
    expect(store.get('m1')?.nextAttemptAt).toEqual(at(3_000));

    publisher.failing.delete('m1');
    clock.set(at(3_000));
    expect(await instance.relayOnce()).toEqual({
      ...NO_RECORDS,
      claimed: 1,
      published: 1,
    });
    expect(publisher.published.map((p) => p.envelope.id)).toEqual(['m1']);
    expect(store.get('m1')?.status).toBe(OutboxStatus.Published);
  });

  it('schedules the retry at the pass start plus a full-jitter delay', async () => {
    const { clock, store, publisher } = setup();
    store.add(envelope('m1'), { now: t0 });
    publisher.failing.add('m1');
    clock.set(at(10_000));
    const relay = new OutboxRelay({
      store,
      publisher,
      topology: testTopology(),
      retryPolicy: new RetryPolicy(
        10,
        1_000,
        60_000,
        BackoffStrategy.FullJitter,
      ),
      clock,
      random: new FixedRandomSource([0.5]),
    });

    await relay.relayOnce();
    expect(store.get('m1')?.nextAttemptAt).toEqual(at(10_500));
  });

  it('keeps retrying a record through a ten minute outage of the transport and publishes it when the transport is back', async () => {
    const { clock, store, publisher, relay } = setup();
    store.add(envelope('m1'), { now: t0 });
    publisher.failing.add('m1');
    const instance = relay({
      retryPolicy: new RetryPolicy(3, 1_000, 60_000, BackoffStrategy.None),
    });

    for (let minute = 0; minute <= 10; minute += 1) {
      clock.set(at(minute * 60_000));
      expect(await instance.relayOnce()).toMatchObject({ dead: 0 });
    }
    publisher.failing.delete('m1');
    clock.set(at(11 * 60_000));

    expect(await instance.relayOnce()).toMatchObject({ published: 1 });
    expect(store.get('m1')).toMatchObject({ status: OutboxStatus.Published });
  });

  it('does not spend an attempt on a record that the open circuit breaker rejected', async () => {
    const { clock, store, publisher, relay } = setup();
    store.add(envelope('m1'), { now: t0 });
    store.add(envelope('m2'), { now: at(1) });
    clock.set(at(10));
    publisher.failing.add('m1');
    publisher.failing.add('m2');
    publisher.error = new CircuitOpenError('queue', 'topic:tasks-events');

    expect(await relay().relayOnce()).toMatchObject({
      claimed: 2,
      failed: 0,
      dead: 0,
      deferred: 2,
    });
    expect(store.get('m1')).toMatchObject({
      status: OutboxStatus.Pending,
      attempts: 0,
    });
    expect(store.get('m2')).toMatchObject({ attempts: 0 });
  });

  it('marks a record with no route Dead without publishing it', async () => {
    const { store, publisher, relay } = setup();
    store.add(envelope('orphan', 'unrouted.type.v1'), { now: t0 });

    expect(await relay().relayOnce()).toEqual({
      ...NO_RECORDS,
      claimed: 1,
      dead: 1,
    });
    expect(publisher.published).toEqual([]);
    expect(store.get('orphan')).toMatchObject({
      status: OutboxStatus.Dead,
      lastError: expect.stringContaining('no route'),
    });
  });

  it('marks a record over 256 KB Dead without publishing it', async () => {
    const { store, publisher, relay } = setup();
    store.add(
      envelope(
        'big',
        'tasks.task.updated.v1',
        'x'.repeat(EnvelopeLimits.MAX_BYTES),
      ),
      { now: t0 },
    );

    expect(await relay().relayOnce()).toEqual({
      ...NO_RECORDS,
      claimed: 1,
      dead: 1,
    });
    expect(publisher.published).toEqual([]);
    expect(store.get('big')).toMatchObject({
      status: OutboxStatus.Dead,
      lastError: expect.stringContaining('bytes'),
    });
  });

  it('keeps going after one record fails', async () => {
    const { store, publisher, relay } = setup();
    store.add(envelope('bad'), { now: t0 });
    store.add(envelope('good'), { now: t0 });
    publisher.failing.add('bad');

    expect(await relay().relayOnce()).toEqual({
      ...NO_RECORDS,
      claimed: 2,
      published: 1,
      failed: 1,
    });
    expect(publisher.published.map((p) => p.envelope.id)).toEqual(['good']);
    expect(store.get('good')?.status).toBe(OutboxStatus.Published);
  });

  it.each([0, -1, 1.5])('rejects a batchSize of %p', (batchSize) => {
    const { relay } = setup();
    expect(() => relay({ batchSize })).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidOptions }),
    );
  });

  it.each([0, -1, 1.5])('rejects a leaseMs of %p', (leaseMs) => {
    const { relay } = setup();
    expect(() => relay({ leaseMs })).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidOptions }),
    );
  });
});
