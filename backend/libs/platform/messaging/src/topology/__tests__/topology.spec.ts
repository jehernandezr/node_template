import { defineCommand, defineEvent } from '@contracts/platform';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { z } from 'zod';
import { MessageKind } from '../../contracts/message-contract.js';
import { QueueDef } from '../queue-def.js';
import { Route } from '../route.js';
import { TargetKind } from '../target-kind.enum.js';
import { TopicDef } from '../topic-def.js';
import { TopologyError } from '../../errors/topology.error.js';
import { Topology, TopologyIssueKind, TopologySeverity } from '../topology.js';

const TaskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: z.object({ id: z.string() }),
  description: 'Mensaje de prueba.',
});

const LedgerPosted = defineEvent({
  type: 'ledger.entry.posted.v1',
  payload: z.object({ amount: z.number() }),
  description: 'Mensaje de prueba.',
});

const GenerateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: z.object({ reportId: z.string() }),
  description: 'Mensaje de prueba.',
});

/** Contratos genéricos para las pruebas de validación puntuales. */
const RunJob = defineCommand({
  type: 'tests.job.run.v1',
  payload: z.object({}),
  description: 'Mensaje de prueba.',
});

const ThingHappened = defineEvent({
  type: 'tests.thing.happened.v1',
  payload: z.object({}),
  description: 'Mensaje de prueba.',
});

/** Topología canónica de prueba. La prueba de JSON de más abajo comprueba su `toJSON()`. */
function platformTopology(): Topology {
  const topics = [
    new TopicDef('tasks-events'),
    new TopicDef('ledger-events', { fifo: true }),
  ];
  const queues = [
    new QueueDef('notifications')
      .subscribesTo(topics[0], { types: ['tasks.task.updated.v1'] })
      .retry(new RetryPolicy(6, 2_000, 600_000, BackoffStrategy.FullJitter))
      .deadLetter({ maxReceiveCount: 6 }),
    new QueueDef('audit')
      .subscribesTo(topics[0])
      .deadLetter({ maxReceiveCount: 5 }),
    new QueueDef('reports').deadLetter({
      maxReceiveCount: 5,
      retentionDays: 7,
    }),
    new QueueDef('ledger-projection')
      .fifo()
      .visibilityTimeout(60)
      .subscribesTo(topics[1])
      .deadLetter({ maxReceiveCount: 5 }),
  ];
  const routes = [
    Route.event(TaskUpdated).to(topics[0]),
    Route.event(LedgerPosted).to(topics[1]),
    Route.command(GenerateReport).to(queues[2]),
  ];
  return new Topology({ topics, queues, routes });
}

/** Arma una topología con una cola, para las pruebas de validación puntuales. */
function singleQueue(queue: QueueDef, topics: TopicDef[] = []): Topology {
  return new Topology({
    topics,
    queues: [queue],
    routes: [Route.command(RunJob).to(queue)],
  });
}

function kindsOf(topology: Topology): TopologyIssueKind[] {
  return topology
    .validate()
    .filter((issue) => issue.severity === TopologySeverity.Error)
    .map((issue) => issue.kind);
}

describe('Topology.validate', () => {
  it('accepts the canonical topology without errors or warnings', () => {
    expect(platformTopology().validate()).toEqual([]);
  });

  it('reports duplicate names and duplicate route types', () => {
    function broken(): Topology {
      const topics = [new TopicDef('alpha'), new TopicDef('alpha')];
      const queues = [
        new QueueDef('queue-a').deadLetter({ maxReceiveCount: 5 }),
        new QueueDef('queue-a').deadLetter({ maxReceiveCount: 5 }),
      ];
      const routes = [
        Route.event(ThingHappened).to(new TopicDef('alpha')),
        Route.event(ThingHappened).to(new TopicDef('alpha')),
      ];
      return new Topology({ topics, queues, routes });
    }
    expect(kindsOf(broken())).toEqual(
      expect.arrayContaining([
        TopologyIssueKind.DuplicateTopic,
        TopologyIssueKind.DuplicateQueue,
        TopologyIssueKind.DuplicateRoute,
      ]),
    );
  });

  it('reports routes to undeclared targets and subscriptions to undeclared topics', () => {
    function broken(): Topology {
      const topics = [new TopicDef('declared')];
      const queues = [
        new QueueDef('queue-a')
          .subscribesTo(new TopicDef('ghost'))
          .deadLetter({ maxReceiveCount: 5 }),
      ];
      const routes = [
        Route.event(ThingHappened).to(new TopicDef('missing')),
        Route.command(RunJob).to(new QueueDef('nope')),
      ];
      return new Topology({ topics, queues, routes });
    }
    expect(kindsOf(broken())).toEqual([
      TopologyIssueKind.UndeclaredRouteTarget,
      TopologyIssueKind.UndeclaredRouteTarget,
      TopologyIssueKind.UndeclaredSubscriptionTopic,
    ]);
  });

  it('rejects a FIFO queue subscribed to a standard topic', () => {
    const topic = new TopicDef('plain');
    const topology = singleQueue(
      new QueueDef('ordered')
        .fifo()
        .subscribesTo(topic)
        .deadLetter({ maxReceiveCount: 5 }),
      [topic],
    );
    expect(kindsOf(topology)).toEqual([TopologyIssueKind.FifoMismatch]);
  });

  it('allows a standard queue subscribed to a FIFO topic', () => {
    const topic = new TopicDef('ordered-events', { fifo: true });
    const topology = singleQueue(
      new QueueDef('plain')
        .subscribesTo(topic)
        .deadLetter({ maxReceiveCount: 5 }),
      [topic],
    );
    expect(kindsOf(topology)).toEqual([]);
  });

  it('requires a dead-letter queue on every queue', () => {
    expect(kindsOf(singleQueue(new QueueDef('queue-a')))).toEqual([
      TopologyIssueKind.MissingDeadLetter,
    ]);
  });

  it('requires maxReceiveCount to be at least the retry maxAttempts', () => {
    // La política por defecto tiene 5 intentos.
    expect(
      kindsOf(
        singleQueue(new QueueDef('queue-a').deadLetter({ maxReceiveCount: 4 })),
      ),
    ).toEqual([TopologyIssueKind.DeadLetterBelowMaxAttempts]);
    expect(
      kindsOf(
        singleQueue(new QueueDef('queue-a').deadLetter({ maxReceiveCount: 5 })),
      ),
    ).toEqual([]);
  });

  it('caps the retry delay at 12 hours', () => {
    const tooLong = new RetryPolicy(
      3,
      1_000,
      12 * 3_600_000 + 1,
      BackoffStrategy.FullJitter,
    );
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('queue-a')
            .retry(tooLong)
            .deadLetter({ maxReceiveCount: 3 }),
        ),
      ),
    ).toEqual([TopologyIssueKind.RetryDelayTooLong]);
  });

  it('keeps the visibility timeout between 1 second and 12 hours', () => {
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('queue-a')
            .visibilityTimeout(43_201)
            .deadLetter({ maxReceiveCount: 5 }),
        ),
      ),
    ).toEqual([TopologyIssueKind.InvalidVisibilityTimeout]);
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('queue-a')
            .visibilityTimeout(43_200)
            .deadLetter({ maxReceiveCount: 5 }),
        ),
      ),
    ).toEqual([]);
  });

  it('keeps DLQ retention between 1 and 14 days', () => {
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('queue-a').deadLetter({
            maxReceiveCount: 5,
            retentionDays: 15,
          }),
        ),
      ),
    ).toEqual([TopologyIssueKind.InvalidRetention]);
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('queue-a').deadLetter({
            maxReceiveCount: 5,
            retentionDays: 0,
          }),
        ),
      ),
    ).toEqual([TopologyIssueKind.InvalidRetention]);
  });

  it('limits queue names to 80 characters including -dlq and .fifo', () => {
    // 76 + "-dlq" = 80: se acepta. 77 + "-dlq" = 81: se rechaza.
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('a'.repeat(76)).deadLetter({ maxReceiveCount: 5 }),
        ),
      ),
    ).toEqual([]);
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('a'.repeat(77)).deadLetter({ maxReceiveCount: 5 }),
        ),
      ),
    ).toEqual([TopologyIssueKind.NameTooLong]);
    // Una cola FIFO suma ".fifo" (5 caracteres) al nombre más largo: 71 + 4 + 5 = 80 se acepta, 72 se rechaza.
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('a'.repeat(71))
            .fifo()
            .deadLetter({ maxReceiveCount: 5 }),
        ),
      ),
    ).toEqual([]);
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('a'.repeat(72))
            .fifo()
            .deadLetter({ maxReceiveCount: 5 }),
        ),
      ),
    ).toEqual([TopologyIssueKind.NameTooLong]);
  });

  it('rejects filter types that no route produces', () => {
    const topic = new TopicDef('events');
    function broken(): Topology {
      const topics = [topic];
      const queues = [
        new QueueDef('queue-a')
          .subscribesTo(topic, { types: ['never.produced.v1'] })
          .deadLetter({ maxReceiveCount: 5 }),
      ];
      const routes = [Route.event(ThingHappened).to(topic)];
      return new Topology({ topics, queues, routes });
    }
    expect(kindsOf(broken())).toEqual([TopologyIssueKind.UnproducedFilterType]);
  });

  it('warns, without failing, when an event has no subscribers', () => {
    const topic = new TopicDef('lonely');
    function lonely(): Topology {
      const topics = [topic];
      const queues: QueueDef[] = [];
      const routes = [Route.event(ThingHappened).to(topic)];
      return new Topology({ topics, queues, routes });
    }
    const topology = lonely();
    expect(topology.validate()).toEqual([
      expect.objectContaining({
        kind: TopologyIssueKind.NoSubscribers,
        severity: TopologySeverity.Warning,
      }),
    ]);
    expect(() => topology.assertValid()).not.toThrow();
  });

  it('requires a contract on every route, its own or one given in the options', () => {
    const topic = new TopicDef('tasks-events');
    function untyped(): Topology {
      const topics = [topic];
      const queues = [
        new QueueDef('audit')
          .subscribesTo(topic)
          .deadLetter({ maxReceiveCount: 5 }),
      ];
      const routes = [Route.event('tasks.task.updated.v1').to(topic)];
      return new Topology({ topics, queues, routes });
    }
    const topology = untyped();
    expect(kindsOf(topology)).toEqual([TopologyIssueKind.RouteWithoutContract]);
    expect(() => topology.assertValid()).toThrow(TopologyError);
    expect(topology.validate({ contracts: [TaskUpdated] })).toEqual([]);
  });

  it('rejects a contract of the other kind', () => {
    const queue = new QueueDef('reports').deadLetter({ maxReceiveCount: 5 });
    function mixed(): Topology {
      const topics: TopicDef[] = [];
      const queues = [queue];
      const routes = [Route.command('reports.report.generate.v1').to(queue)];
      return new Topology({ topics, queues, routes });
    }
    expect(
      mixed()
        .validate({ contracts: [GenerateReport] })
        .map((issue) => issue.kind),
    ).toEqual([]);
    function wrong(): Topology {
      const topics: TopicDef[] = [];
      const queues = [queue];
      const routes = [Route.command('tasks.task.updated.v1').to(queue)];
      return new Topology({ topics, queues, routes });
    }
    expect(
      wrong()
        .validate({ contracts: [TaskUpdated] })
        .map((issue) => issue.kind),
    ).toEqual([TopologyIssueKind.ContractKindMismatch]);
  });

  it.each(['Jobs_1-a', 'jobs queue', 'a', 'ends-'])(
    'rejects the queue name "%s", which does not match the messaging name pattern',
    (name) => {
      expect(
        kindsOf(
          singleQueue(new QueueDef(name).deadLetter({ maxReceiveCount: 5 })),
        ),
      ).toEqual([TopologyIssueKind.InvalidName]);
    },
  );

  it('rejects a topic name that does not match the messaging name pattern', () => {
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('jobs-queue').deadLetter({ maxReceiveCount: 5 }),
          [new TopicDef('tasks.events')],
        ),
      ),
    ).toEqual([TopologyIssueKind.InvalidName]);
  });

  it('accepts names of lowercase letters, digits and hyphens', () => {
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('jobs-queue-2').deadLetter({ maxReceiveCount: 5 }),
        ),
      ),
    ).toEqual([]);
  });

  it('assertValid throws a TopologyError carrying every error issue', () => {
    function broken(): Topology {
      const topics = [new TopicDef('alpha'), new TopicDef('alpha')];
      const queues: QueueDef[] = [];
      const routes: never[] = [];
      return new Topology({ topics, queues, routes });
    }
    expect(() => broken().assertValid()).toThrow(TopologyError);
  });
});

describe('Topology routing and export', () => {
  it('resolves routes by message type and keeps the contract of contract-based routes', () => {
    const topology = platformTopology();
    expect(topology.routeFor('tasks.task.updated.v1')).toMatchObject({
      kind: MessageKind.Event,
      targetKind: TargetKind.Topic,
      contract: TaskUpdated,
    });
    expect(topology.routeFor('ledger.entry.posted.v1')?.contract).toBe(
      LedgerPosted,
    );
    expect(topology.queueFor('reports')?.name).toBe('reports');
    expect(topology.queueFor('nope')).toBeUndefined();
    expect(topology.routeFor('unknown')).toBeUndefined();
  });

  it('exports the canonical JSON with stable ordering', () => {
    expect(platformTopology().toJSON()).toEqual({
      topics: [
        { name: 'ledger-events', fifo: true },
        { name: 'tasks-events', fifo: false },
      ],
      queues: [
        {
          name: 'audit',
          fifo: false,
          visibilityTimeoutSeconds: 30,
          maxAttempts: 5,
          dlq: {
            name: 'audit-dlq',
            maxReceiveCount: 5,
            retentionSeconds: 14 * 86_400,
          },
          subscriptions: [{ topic: 'tasks-events', filterTypes: [] }],
        },
        {
          name: 'ledger-projection',
          fifo: true,
          visibilityTimeoutSeconds: 60,
          maxAttempts: 5,
          dlq: {
            name: 'ledger-projection-dlq',
            maxReceiveCount: 5,
            retentionSeconds: 14 * 86_400,
          },
          subscriptions: [{ topic: 'ledger-events', filterTypes: [] }],
        },
        {
          name: 'notifications',
          fifo: false,
          visibilityTimeoutSeconds: 30,
          maxAttempts: 6,
          dlq: {
            name: 'notifications-dlq',
            maxReceiveCount: 6,
            retentionSeconds: 14 * 86_400,
          },
          subscriptions: [
            { topic: 'tasks-events', filterTypes: ['tasks.task.updated.v1'] },
          ],
        },
        {
          name: 'reports',
          fifo: false,
          visibilityTimeoutSeconds: 30,
          maxAttempts: 5,
          dlq: {
            name: 'reports-dlq',
            maxReceiveCount: 5,
            retentionSeconds: 7 * 86_400,
          },
          subscriptions: [],
        },
      ],
      routes: [
        {
          type: 'ledger.entry.posted.v1',
          kind: MessageKind.Event,
          target: 'ledger-events',
          targetKind: TargetKind.Topic,
        },
        {
          type: 'reports.report.generate.v1',
          kind: MessageKind.Command,
          target: 'reports',
          targetKind: TargetKind.Queue,
        },
        {
          type: 'tasks.task.updated.v1',
          kind: MessageKind.Event,
          target: 'tasks-events',
          targetKind: TargetKind.Topic,
        },
      ],
    });
  });

  it('is serialized by JSON.stringify and refuses to export an invalid topology', () => {
    expect(JSON.parse(JSON.stringify(platformTopology()))).toEqual(
      platformTopology().toJSON(),
    );

    function broken(): Topology {
      const topics = [new TopicDef('alpha'), new TopicDef('alpha')];
      const queues: QueueDef[] = [];
      const routes: never[] = [];
      return new Topology({ topics, queues, routes });
    }
    expect(() => broken().toJSON()).toThrow(TopologyError);
  });
});
