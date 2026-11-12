import {
  createEnvelope,
  MAX_ENVELOPE_BYTES,
} from '../envelope/message-envelope.js';
import { QueueDef } from '../topology/queue-def.js';
import { Route } from '../topology/route.js';
import { TopicDef } from '../topology/topic-def.js';
import { Topology } from '../topology/topology.js';
import type {
  EnvelopePublisher,
  OutboundTarget,
  OutboxLease,
  PublishOutboxOptions,
} from './outbox.js';
import { OutboxStatus } from './outbox.js';
import { InMemoryOutboxStore } from './in-memory-outbox-store.js';
import { OutboxRelay } from './outbox-relay.js';

const events = new TopicDef('tasks-events');

class TestTopology extends Topology {
  readonly topics = [events];
  readonly queues = [
    new QueueDef('notifications')
      .subscribesTo(events)
      .deadLetter({ maxReceiveCount: 5 }),
  ];
  readonly routes = [Route.event('tasks.task.updated.v1').to(events)];
}

const t0 = new Date('2026-01-01T00:00:00.000Z');
const at = (ms: number) => new Date(t0.getTime() + ms);
const backoff = { baseMs: 1_000, maxMs: 60_000, jitter: false };

function envelope(
  id: string,
  type = 'tasks.task.updated.v1',
  data: unknown = { id },
) {
  return createEnvelope(
    { type, source: '/test', data },
    { newId: () => id, now: () => t0 },
  );
}

interface Published {
  readonly id: string;
  readonly target: OutboundTarget;
  readonly options: PublishOutboxOptions;
}

function publisherWith(fail: (id: string) => boolean, log: string[] = []) {
  const published: Published[] = [];
  const publisher: EnvelopePublisher = {
    publish: (message, target, options) => {
      log.push(`publish:${message.id}`);
      if (fail(message.id))
        return Promise.reject(new Error(`broker rejected ${message.id}`));
      published.push({ id: message.id, target, options });
      return Promise.resolve();
    },
  };
  return { publisher, published };
}

function relayFor(
  store: InMemoryOutboxStore,
  publisher: EnvelopePublisher,
  extra: { maxAttempts?: number } = {},
) {
  return new OutboxRelay({
    store,
    publisher,
    topology: new TestTopology(),
    backoff,
    ...extra,
  });
}

describe('OutboxRelay', () => {
  it('publishes due records to the topic from the topology, passing the groupId', async () => {
    const store = new InMemoryOutboxStore();
    store.add(envelope('m1'), { now: t0, groupId: 'order-1' });
    store.add(envelope('m2'), { now: t0 });
    const { publisher, published } = publisherWith(() => false);

    expect(await relayFor(store, publisher).relayOnce(t0)).toEqual({
      claimed: 2,
      published: 2,
      failed: 0,
      dead: 0,
      deferred: 0,
      stale: 0,
    });
    expect(published).toEqual([
      {
        id: 'm1',
        target: { kind: 'topic', name: 'tasks-events' },
        options: { groupId: 'order-1' },
      },
      {
        id: 'm2',
        target: { kind: 'topic', name: 'tasks-events' },
        options: { groupId: undefined },
      },
    ]);
    expect(store.get('m1')?.status).toBe(OutboxStatus.Published);
    expect(await relayFor(store, publisher).relayOnce(t0)).toEqual({
      claimed: 0,
      published: 0,
      failed: 0,
      dead: 0,
      deferred: 0,
      stale: 0,
    });
  });

  it('marks each record published right after its own publish, not in one batch at the end', async () => {
    class LoggingStore extends InMemoryOutboxStore {
      constructor(private readonly log: string[]) {
        super();
      }

      override markPublished(id: string, lease: OutboxLease): Promise<boolean> {
        this.log.push(`mark:${id}`);
        return super.markPublished(id, lease);
      }
    }
    const log: string[] = [];
    const store = new LoggingStore(log);
    store.add(envelope('m1'), { now: t0 });
    store.add(envelope('m2'), { now: t0 });
    const { publisher } = publisherWith(() => false, log);

    await relayFor(store, publisher).relayOnce(t0);
    expect(log).toEqual(['publish:m1', 'mark:m1', 'publish:m2', 'mark:m2']);
  });

  it('schedules failed records with exponential backoff and retries them when due', async () => {
    const store = new InMemoryOutboxStore();
    store.add(envelope('m1'), { now: t0 });
    let failing = true;
    const { publisher, published } = publisherWith(() => failing);
    const relay = relayFor(store, publisher);

    expect(await relay.relayOnce(t0)).toEqual({
      claimed: 1,
      published: 0,
      failed: 1,
      dead: 0,
      deferred: 0,
      stale: 0,
    });
    expect(store.get('m1')).toMatchObject({
      status: OutboxStatus.Failed,
      attempts: 1,
      lastError: 'broker rejected m1',
      nextAttemptAt: at(1_000),
    });

    // Not due yet.
    expect(await relay.relayOnce(at(999))).toEqual({
      claimed: 0,
      published: 0,
      failed: 0,
      dead: 0,
      deferred: 0,
      stale: 0,
    });

    // Second failure doubles the delay.
    expect(await relay.relayOnce(at(1_000))).toEqual({
      claimed: 1,
      published: 0,
      failed: 1,
      dead: 0,
      deferred: 0,
      stale: 0,
    });
    expect(store.get('m1')?.nextAttemptAt).toEqual(at(3_000));

    failing = false;
    expect(await relay.relayOnce(at(3_000))).toEqual({
      claimed: 1,
      published: 1,
      failed: 0,
      dead: 0,
      deferred: 0,
      stale: 0,
    });
    expect(published.map((p) => p.id)).toEqual(['m1']);
    expect(store.get('m1')?.status).toBe(OutboxStatus.Published);
  });

  it('marks a record Dead once it reaches maxAttempts', async () => {
    const store = new InMemoryOutboxStore();
    store.add(envelope('m1'), { now: t0 });
    const { publisher } = publisherWith(() => true);
    const relay = relayFor(store, publisher, { maxAttempts: 2 });

    expect(await relay.relayOnce(t0)).toEqual({
      claimed: 1,
      published: 0,
      failed: 1,
      dead: 0,
      deferred: 0,
      stale: 0,
    });
    expect(await relay.relayOnce(at(1_000))).toEqual({
      claimed: 1,
      published: 0,
      failed: 0,
      dead: 1,
      deferred: 0,
      stale: 0,
    });
    expect(store.get('m1')).toMatchObject({
      status: OutboxStatus.Dead,
      attempts: 2,
      lastError: 'broker rejected m1',
    });
  });

  it('marks a record with no route Dead without publishing it', async () => {
    const store = new InMemoryOutboxStore();
    store.add(envelope('orphan', 'unrouted.type.v1'), { now: t0 });
    const { publisher, published } = publisherWith(() => false);

    expect(await relayFor(store, publisher).relayOnce(t0)).toEqual({
      claimed: 1,
      published: 0,
      failed: 0,
      dead: 1,
      deferred: 0,
      stale: 0,
    });
    expect(published).toEqual([]);
    expect(store.get('orphan')).toMatchObject({
      status: OutboxStatus.Dead,
      lastError: expect.stringContaining('no route'),
    });
  });

  it('marks a record over 256 KB Dead without publishing it', async () => {
    const store = new InMemoryOutboxStore();
    store.add(
      envelope('big', 'tasks.task.updated.v1', 'x'.repeat(MAX_ENVELOPE_BYTES)),
      { now: t0 },
    );
    const { publisher, published } = publisherWith(() => false);

    expect(await relayFor(store, publisher).relayOnce(t0)).toEqual({
      claimed: 1,
      published: 0,
      failed: 0,
      dead: 1,
      deferred: 0,
      stale: 0,
    });
    expect(published).toEqual([]);
    expect(store.get('big')).toMatchObject({
      status: OutboxStatus.Dead,
      lastError: expect.stringContaining('bytes'),
    });
  });

  it('keeps going after one record fails', async () => {
    const store = new InMemoryOutboxStore();
    store.add(envelope('bad'), { now: t0 });
    store.add(envelope('good'), { now: t0 });
    const { publisher, published } = publisherWith((id) => id === 'bad');

    expect(await relayFor(store, publisher).relayOnce(t0)).toEqual({
      claimed: 2,
      published: 1,
      failed: 1,
      dead: 0,
      deferred: 0,
      stale: 0,
    });
    expect(published.map((p) => p.id)).toEqual(['good']);
    expect(store.get('good')?.status).toBe(OutboxStatus.Published);
  });
});
