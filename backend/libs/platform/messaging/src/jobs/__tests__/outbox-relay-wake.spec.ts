import { defineEvent } from '@contracts/platform';
import { SystemClock, SystemRandomSource } from '@platform/kernel';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { NoopMetrics } from '@platform/observability';
import { InProcessJobLock, JobRunner } from '@platform/scheduling';
import { z } from 'zod';
import {
  Eventually,
  InMemoryOutboxStore,
  InMemoryTransactionManager,
  RecordingEnvelopePublisher,
  SilentLogger,
} from '../../__tests__/utils/index.js';
import { OutboxMessageBus } from '../../bus/outbox-message-bus.js';
import { OutboxRelay } from '../../outbox/outbox-relay.js';
import { QueueDef } from '../../topology/queue-def.js';
import { Route } from '../../topology/route.js';
import { TopicDef } from '../../topology/topic-def.js';
import { Topology } from '../../topology/topology.js';
import { SingleRelayScope } from '../../relay/single-relay-scope.js';
import { MessagingJob } from '../messaging-job.enum.js';
import { OutboxRelayJob } from '../outbox-relay-job.js';

const events = new TopicDef('user-events');

const UserRegistered = defineEvent({
  type: 'tests.user.registered.v1',
  payload: z.object({ userId: z.string().min(1) }),
  description: 'A user was registered.',
});

/**
 * The first relay interval falls between 800 and 1 200 ms with the job jitter,
 * so a 500 ms timeout is only met if the commit wakes it up.
 */
describe('OutboxRelayJob woken by a commit', () => {
  let runner: JobRunner | undefined;

  afterEach(async () => {
    await runner?.stop(0);
    runner = undefined;
  });

  it('publishes right after the commit without waiting for the interval', async () => {
    const clock = new SystemClock();
    const random = new SystemRandomSource();
    const transactions = new InMemoryTransactionManager();
    const store = new InMemoryOutboxStore({ clock, transactions });
    const publisher = new RecordingEnvelopePublisher();
    const topology = new Topology({
      topics: [events],
      queues: [
        new QueueDef('notifications')
          .subscribesTo(events)
          .deadLetter({ maxReceiveCount: 5 }),
      ],
      routes: [Route.event(UserRegistered).to(events)],
    });
    const relay = new OutboxRelay({
      store,
      publisher,
      topology,
      retryPolicy: new RetryPolicy(3, 1_000, 60_000, BackoffStrategy.None),
      clock,
      random,
    });
    const instance = new JobRunner(
      clock,
      random,
      new InProcessJobLock(clock, random),
      new SilentLogger(),
      new NoopMetrics(),
    );
    runner = instance;
    instance.register(new OutboxRelayJob(relay, new SingleRelayScope()));
    instance.start();
    const bus = new OutboxMessageBus({
      topology,
      writer: store,
      transactions,
      source: '/services/users',
      clock,
      traceparent: () => undefined,
      onCommitted: () => instance.trigger(MessagingJob.OutboxRelay),
    });

    await transactions.runInTransaction(async () => {
      await bus.publish(UserRegistered, { userId: 'u-1' });
      expect(publisher.published).toEqual([]);
    });

    await Eventually.until(() => publisher.published.length === 1, 500);
    expect(publisher.published[0]?.envelope).toEqual(
      expect.objectContaining({
        type: UserRegistered.type,
        data: { userId: 'u-1' },
      }),
    );
  });
});
