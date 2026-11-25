import { defineCommand, defineEvent } from '@contracts/platform';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { z } from 'zod';
import { MessageDispatcher } from '../dispatch/message-dispatcher.js';
import { QueueDef } from '../topology/queue-def.js';
import { Route } from '../topology/route.js';
import { TopicDef } from '../topology/topic-def.js';
import { TargetKind } from '../topology/target-kind.enum.js';
import { Topology } from '../topology/topology.js';
import { InMemoryBus } from './utils/in-memory-bus.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import { EnvelopeLimits } from '../envelope/envelope-limits.js';
import { InMemoryProcessedMessageStore } from './utils/in-memory-processed-message-store.js';

const TaskCreated = defineEvent({
  type: 'tasks.task.created.v1',
  payload: z.object({ id: z.string() }),
  description: 'Test message.',
});

const TaskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: z.object({ id: z.string() }),
  description: 'Test message.',
});

const GenerateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: z.object({ reportId: z.string() }),
  description: 'Test message.',
});

const Blob = defineCommand({
  type: 'blobs.blob.store.v1',
  payload: z.object({ body: z.string() }),
  description: 'Test message.',
});

const tasksEvents = new TopicDef('tasks-events');

function testTopology(): Topology {
  const topics = [tasksEvents];
  const queues = [
    new QueueDef('notifications')
      .subscribesTo(tasksEvents, { types: ['tasks.task.updated.v1'] })
      .retry(new RetryPolicy(2, 1_000, 10_000, BackoffStrategy.None))
      .deadLetter({ maxReceiveCount: 2 }),
    new QueueDef('audit')
      .subscribesTo(tasksEvents)
      .deadLetter({ maxReceiveCount: 5 }),
    new QueueDef('reports').deadLetter({ maxReceiveCount: 5 }),
    new QueueDef('blobs').deadLetter({ maxReceiveCount: 5 }),
  ];
  const routes = [
    Route.event(TaskCreated).to(tasksEvents),
    Route.event(TaskUpdated).to(tasksEvents),
    Route.command(GenerateReport).to(queues[2]),
    Route.command(Blob).to(queues[3]),
  ];
  return new Topology({ topics, queues, routes });
}

function setup() {
  let clock = 0;
  const bus = new InMemoryBus(testTopology(), {
    source: '/services/tasks',
    clock: { now: () => new Date(clock) },
    ids: new SequentialIdGenerator(),
  });
  const dispatcher = new MessageDispatcher({
    consumer: 'notifications',
    processed: new InMemoryProcessedMessageStore(),
  });
  return {
    bus,
    dispatcher,
    setClock: (ms: number) => {
      clock = ms;
    },
  };
}

describe('InMemoryBus', () => {
  it('fans events out to every subscribed queue, honouring type filters', async () => {
    const { bus } = setup();
    await bus.publish(TaskUpdated, { id: 't1' });
    await bus.publish(TaskCreated, { id: 't2' });

    expect(bus.pendingCount('notifications')).toBe(1);
    expect(bus.pendingCount('audit')).toBe(2);
    expect(bus.pendingCount('reports')).toBe(0);
  });

  it('sends commands to the single queue of their route', async () => {
    const { bus } = setup();
    const envelope = await bus.send(GenerateReport, { reportId: 'r1' });
    expect(envelope).toMatchObject({
      type: 'reports.report.generate.v1',
      source: '/services/tasks',
      data: { reportId: 'r1' },
    });
    expect(bus.pendingCount('reports')).toBe(1);
    expect(bus.pendingCount('audit')).toBe(0);
  });

  it('accepts a relayed event and fans it out by its type', async () => {
    const { bus } = setup();
    const source = setup().bus;
    const envelope = await source.publish(TaskUpdated, { id: 't1' });

    bus.accept(envelope, { kind: TargetKind.Topic, name: 'tasks-events' });

    expect(bus.pendingCount('notifications')).toBe(1);
    expect(bus.pendingCount('audit')).toBe(1);
  });

  it('accepts a relayed command and holds it until its delay passes', async () => {
    const { bus, dispatcher, setClock } = setup();
    const envelope = await setup().bus.send(GenerateReport, {
      reportId: 'r1',
    });

    bus.accept(envelope, { kind: TargetKind.Queue, name: 'reports' }, 500);
    await bus.drain('reports', dispatcher);
    const waiting = bus.pendingCount('reports');
    setClock(500);
    await bus.drain('reports', dispatcher);

    expect(waiting).toBe(1);
    expect(bus.pendingCount('reports')).toBe(0);
  });

  it('rejects an unrouted type', async () => {
    const { bus } = setup();
    const Unrouted = defineEvent({
      type: 'nobody.listens.here.v1',
      payload: z.object({ x: z.number() }),
      description: 'Test message.',
    });
    await expect(bus.publish(Unrouted, { x: 1 })).rejects.toMatchObject({
      code: MessagingErrorCode.UnknownRoute,
    });
  });

  it('validates the payload against the contract before enqueueing', async () => {
    const { bus } = setup();
    await expect(
      bus.publish(TaskCreated, { id: 42 as unknown as string }),
    ).rejects.toMatchObject({
      code: MessagingErrorCode.InvalidPayload,
    });
    await expect(
      bus.send(GenerateReport, { reportId: 1 as unknown as string }),
    ).rejects.toMatchObject({
      code: MessagingErrorCode.InvalidPayload,
    });
    expect(bus.pendingCount('audit')).toBe(0);
  });

  it('rejects envelopes over 256 KB with PayloadTooLarge', async () => {
    const { bus } = setup();
    await expect(
      bus.send(Blob, { body: 'x'.repeat(EnvelopeLimits.MAX_BYTES) }),
    ).rejects.toMatchObject({
      code: MessagingErrorCode.PayloadTooLarge,
    });
    expect(bus.pendingCount('blobs')).toBe(0);
  });

  it('returns the JSON round-trip of the envelope it enqueued', async () => {
    const { bus } = setup();
    const envelope = await bus.publish(
      TaskCreated,
      { id: 't1' },
      { traceparent: undefined, subject: 'task/1' },
    );
    expect(envelope).toEqual(JSON.parse(JSON.stringify(envelope)));
    expect(envelope.subject).toBe('task/1');
  });

  it('drains due messages, processes them and keeps dead letters', async () => {
    const { bus, dispatcher } = setup();
    const handled: string[] = [];
    dispatcher.register(TaskUpdated, (data) => {
      handled.push(data.id);
    });
    await bus.publish(TaskUpdated, { id: 't1' });
    await bus.publish(TaskCreated, { id: 't2' });

    const report = await bus.drain('notifications', dispatcher);
    expect(report).toEqual({
      processed: 1,
      duplicates: 0,
      ignored: 0,
      retried: 0,
      deadLettered: 0,
      inProgress: 0,
    });
    expect(handled).toEqual(['t1']);
    expect(bus.pendingCount('notifications')).toBe(0);
  });

  it('re-enqueues retries after their backoff delay and dead-letters at max attempts', async () => {
    const { bus, dispatcher, setClock } = setup();
    dispatcher.register(TaskUpdated, () => {
      throw Object.assign(new Error('downstream down'), { retryable: true });
    });
    await bus.publish(TaskUpdated, { id: 't1' });

    setClock(0);
    expect(await bus.drain('notifications', dispatcher)).toMatchObject({
      retried: 1,
    });
    expect(bus.pendingCount('notifications')).toBe(1);

    // Not due yet: the retry waits for its 1 s backoff.
    setClock(500);
    expect(await bus.drain('notifications', dispatcher)).toEqual({
      processed: 0,
      duplicates: 0,
      ignored: 0,
      retried: 0,
      deadLettered: 0,
      inProgress: 0,
    });

    setClock(1_000);
    expect(await bus.drain('notifications', dispatcher)).toMatchObject({
      deadLettered: 1,
    });
    expect(bus.deadLetters('notifications')).toEqual([
      expect.objectContaining({ receiveCount: 2, error: 'downstream down' }),
    ]);
  });

  it('delays sent commands until their delay elapses', async () => {
    const { bus, setClock } = setup();
    const reportDispatcher = new MessageDispatcher({
      consumer: 'reports',
      processed: new InMemoryProcessedMessageStore(),
    });
    reportDispatcher.register(GenerateReport, () => undefined);
    await bus.send(GenerateReport, { reportId: 'r1' }, { delayMs: 5_000 });

    setClock(4_999);
    expect(await bus.drain('reports', reportDispatcher)).toMatchObject({
      processed: 0,
    });
    setClock(5_000);
    expect(await bus.drain('reports', reportDispatcher)).toMatchObject({
      processed: 1,
    });
  });

  it('throws for unknown queues', () => {
    const { bus } = setup();
    expect(() => bus.pendingCount('missing')).toThrow(
      expect.objectContaining({
        code: MessagingErrorCode.UnknownQueue,
      }),
    );
  });
});
