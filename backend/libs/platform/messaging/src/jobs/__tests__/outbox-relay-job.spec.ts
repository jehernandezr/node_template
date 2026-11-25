import { FixedClock, FixedRandomSource } from '@platform/kernel/test-utils';
import { JobScheduleKind } from '@platform/kernel';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { defineEvent } from '@contracts/platform';
import { z } from 'zod';
import {
  EnvelopeBuilder,
  InMemoryOutboxStore,
  RecordingEnvelopePublisher,
} from '../../__tests__/utils/index.js';
import { OutboxStatus } from '../../outbox/outbox.js';
import { OutboxRelay } from '../../outbox/outbox-relay.js';
import { QueueDef } from '../../topology/queue-def.js';
import { Route } from '../../topology/route.js';
import { TopicDef } from '../../topology/topic-def.js';
import { Topology } from '../../topology/topology.js';
import { SingleRelayScope } from '../../relay/single-relay-scope.js';
import { MessagingJob } from '../messaging-job.enum.js';
import { InMemoryMetrics } from '@platform/observability/test-utils';
import { OutboxMetric } from '../../outbox/outbox-metric.enum.js';
import { OutboxRelayJob } from '../outbox-relay-job.js';
import { RecordingLogger } from './utils/recording-logger.js';
import { TwiceRelayScopes } from './utils/twice-relay-scopes.js';

const t0 = new Date('2026-01-01T00:00:00.000Z');
const events = new TopicDef('user-events');

const UserRegistered = defineEvent({
  type: 'tests.user.registered.v1',
  payload: z.object({ userId: z.string().min(1) }),
  description: 'A user was registered.',
});

function setup() {
  const clock = new FixedClock(t0);
  const topology = new Topology({
    topics: [events],
    queues: [
      new QueueDef('notifications')
        .subscribesTo(events)
        .deadLetter({ maxReceiveCount: 5 }),
    ],
    routes: [Route.event(UserRegistered).to(events)],
  });
  const store = new InMemoryOutboxStore({ clock });
  const publisher = new RecordingEnvelopePublisher();
  const relay = new OutboxRelay({
    store,
    publisher,
    topology,
    retryPolicy: new RetryPolicy(3, 1_000, 60_000, BackoffStrategy.None),
    clock,
    random: new FixedRandomSource([0.5]),
  });
  return { store, publisher, relay };
}

describe('OutboxRelayJob', () => {
  it('declares the outbox job name and its interval schedule', () => {
    const { relay } = setup();
    const job = new OutboxRelayJob(relay, new SingleRelayScope());

    expect(job).toMatchObject({
      name: MessagingJob.OutboxRelay,
      schedule: {
        kind: JobScheduleKind.Interval,
        everyMs: 1_000,
        jitterRatio: 0.2,
      },
      exclusive: false,
    });
  });

  it('publishes a batch of due records against the in-memory store', async () => {
    const { store, publisher, relay } = setup();
    store.add(
      EnvelopeBuilder.anEnvelope({
        id: 'e1',
        type: UserRegistered.type,
        source: '/test',
        data: { userId: 'u-1' },
      }),
    );
    store.add(
      EnvelopeBuilder.anEnvelope({
        id: 'e2',
        type: UserRegistered.type,
        source: '/test',
        data: { userId: 'u-2' },
      }),
    );

    await new OutboxRelayJob(relay, new SingleRelayScope()).run();

    expect(publisher.published.map((p) => p.envelope.id)).toEqual(['e1', 'e2']);
    expect(store.get('e1')?.status).toBe(OutboxStatus.Published);
  });

  it('does not publish a record twice when the scopes run the pass twice', async () => {
    const { store, publisher, relay } = setup();
    store.add(
      EnvelopeBuilder.anEnvelope({
        id: 'e1',
        type: UserRegistered.type,
        source: '/test',
        data: { userId: 'u-1' },
      }),
    );

    await new OutboxRelayJob(relay, new TwiceRelayScopes()).run();

    expect(publisher.published.map((p) => p.envelope.id)).toEqual(['e1']);
    expect(publisher.attempts).toBe(1);
    expect(store.get('e1')).toMatchObject({
      status: OutboxStatus.Published,
      attempts: 1,
    });
  });

  it('publishes the report of each pass as counters and logs the records that can never be delivered', async () => {
    const { store, publisher, relay } = setup();
    store.add(
      EnvelopeBuilder.anEnvelope({
        id: 'e1',
        type: UserRegistered.type,
        source: '/test',
        data: { userId: 'u-1' },
      }),
    );
    store.add(
      EnvelopeBuilder.anEnvelope({
        id: 'e2',
        type: 'tests.unrouted.v1',
        source: '/test',
        data: {},
      }),
    );
    store.add(
      EnvelopeBuilder.anEnvelope({
        id: 'e3',
        type: UserRegistered.type,
        source: '/test',
        data: { userId: 'u-3' },
      }),
    );
    publisher.failing.add('e3');
    const metrics = new InMemoryMetrics();
    const logger = new RecordingLogger();

    await new OutboxRelayJob(
      relay,
      new SingleRelayScope(),
      metrics,
      logger,
    ).run();

    expect(metrics.total(OutboxMetric.Published)).toBe(1);
    expect(metrics.total(OutboxMetric.Dead)).toBe(1);
    expect(metrics.total(OutboxMetric.Failed)).toBe(1);
    expect(logger.errors).toEqual([
      expect.objectContaining({
        message: 'outbox records can never be delivered',
      }),
    ]);
  });
});
