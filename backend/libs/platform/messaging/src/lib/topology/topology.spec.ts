import { z } from 'zod';
import {
  CommandContract,
  EventContract,
  MessageKind,
} from '../contracts/message-contract.js';
import { QueueDef } from './queue-def.js';
import { RetryPolicy } from './retry-policy.js';
import { Route, TargetKind } from './route.js';
import { TopicDef } from './topic-def.js';
import {
  Topology,
  TopologyError,
  TopologyIssueKind,
  TopologySeverity,
} from './topology.js';

class TaskUpdated extends EventContract<{ id: string }> {
  readonly type = 'tasks.task.updated.v1';
  readonly schema = z.object({ id: z.string() });
}

/** The canonical test topology. Its toJSON() export is asserted in the JSON test below. */
class PlatformTopology extends Topology {
  readonly topics = [
    new TopicDef('tasks-events'),
    new TopicDef('ledger-events', { fifo: true }),
  ];

  readonly queues = [
    new QueueDef('notifications')
      .subscribesTo(this.topics[0], { types: ['tasks.task.updated.v1'] })
      .retry(
        RetryPolicy.exponential({
          maxAttempts: 6,
          baseMs: 2_000,
          maxMs: 600_000,
          jitter: true,
        }),
      )
      .deadLetter({ maxReceiveCount: 6 }),
    new QueueDef('audit')
      .subscribesTo(this.topics[0])
      .deadLetter({ maxReceiveCount: 5 }),
    new QueueDef('reports').deadLetter({
      maxReceiveCount: 5,
      retentionDays: 7,
    }),
    new QueueDef('ledger-projection')
      .fifo()
      .visibilityTimeout(60)
      .subscribesTo(this.topics[1])
      .deadLetter({ maxReceiveCount: 5 }),
  ];

  readonly routes = [
    Route.event(new TaskUpdated()).to(this.topics[0]),
    Route.event('ledger.entry.posted.v1').to(this.topics[1]),
    Route.command('reports.generate.v1').to(this.queues[2]),
  ];
}

/** Builds a topology with one queue, for targeted validation tests. */
function singleQueue(queue: QueueDef, topics: TopicDef[] = []): Topology {
  class Single extends Topology {
    readonly topics = topics;
    readonly queues = [queue];
    readonly routes = [Route.command('cmd.v1').to(queue)];
  }
  return new Single();
}

function kindsOf(topology: Topology): TopologyIssueKind[] {
  return topology
    .validate()
    .filter((issue) => issue.severity === TopologySeverity.Error)
    .map((issue) => issue.kind);
}

describe('Topology.validate', () => {
  it('accepts the canonical topology without errors or warnings', () => {
    expect(new PlatformTopology().validate()).toEqual([]);
  });

  it('reports duplicate names and duplicate route types', () => {
    class Broken extends Topology {
      readonly topics = [new TopicDef('a'), new TopicDef('a')];
      readonly queues = [
        new QueueDef('q').deadLetter({ maxReceiveCount: 5 }),
        new QueueDef('q').deadLetter({ maxReceiveCount: 5 }),
      ];
      readonly routes = [
        Route.event('x').to(new TopicDef('a')),
        Route.event('x').to(new TopicDef('a')),
      ];
    }
    expect(kindsOf(new Broken())).toEqual(
      expect.arrayContaining([
        TopologyIssueKind.DuplicateTopic,
        TopologyIssueKind.DuplicateQueue,
        TopologyIssueKind.DuplicateRoute,
      ]),
    );
  });

  it('reports routes to undeclared targets and subscriptions to undeclared topics', () => {
    class Broken extends Topology {
      readonly topics = [new TopicDef('declared')];
      readonly queues = [
        new QueueDef('q')
          .subscribesTo(new TopicDef('ghost'))
          .deadLetter({ maxReceiveCount: 5 }),
      ];
      readonly routes = [
        Route.event('e').to(new TopicDef('missing')),
        Route.command('c').to(new QueueDef('nope')),
      ];
    }
    expect(kindsOf(new Broken())).toEqual([
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
    expect(kindsOf(singleQueue(new QueueDef('q')))).toEqual([
      TopologyIssueKind.MissingDeadLetter,
    ]);
  });

  it('requires maxReceiveCount to be at least the retry maxAttempts', () => {
    // Default policy has 5 attempts.
    expect(
      kindsOf(
        singleQueue(new QueueDef('q').deadLetter({ maxReceiveCount: 4 })),
      ),
    ).toEqual([TopologyIssueKind.DeadLetterBelowMaxAttempts]);
    expect(
      kindsOf(
        singleQueue(new QueueDef('q').deadLetter({ maxReceiveCount: 5 })),
      ),
    ).toEqual([]);
  });

  it('caps the retry delay at 12 hours', () => {
    const tooLong = RetryPolicy.exponential({
      maxAttempts: 3,
      baseMs: 1_000,
      maxMs: 12 * 3_600_000 + 1,
    });
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('q').retry(tooLong).deadLetter({ maxReceiveCount: 3 }),
        ),
      ),
    ).toEqual([TopologyIssueKind.RetryDelayTooLong]);
  });

  it('keeps the visibility timeout between 1 second and 12 hours', () => {
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('q')
            .visibilityTimeout(43_201)
            .deadLetter({ maxReceiveCount: 5 }),
        ),
      ),
    ).toEqual([TopologyIssueKind.InvalidVisibilityTimeout]);
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('q')
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
          new QueueDef('q').deadLetter({
            maxReceiveCount: 5,
            retentionDays: 15,
          }),
        ),
      ),
    ).toEqual([TopologyIssueKind.InvalidRetention]);
    expect(
      kindsOf(
        singleQueue(
          new QueueDef('q').deadLetter({
            maxReceiveCount: 5,
            retentionDays: 0,
          }),
        ),
      ),
    ).toEqual([TopologyIssueKind.InvalidRetention]);
  });

  it('limits queue names to 80 characters including -dlq and .fifo', () => {
    // 76 + "-dlq" = 80: allowed. 77 + "-dlq" = 81: rejected.
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
    // A FIFO queue adds ".fifo" (5 characters) to the longest name: 71 + 4 + 5 = 80 allowed, 72 rejected.
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
    class Broken extends Topology {
      readonly topics = [topic];
      readonly queues = [
        new QueueDef('q')
          .subscribesTo(topic, { types: ['never.produced.v1'] })
          .deadLetter({ maxReceiveCount: 5 }),
      ];
      readonly routes = [Route.event('produced.v1').to(topic)];
    }
    expect(kindsOf(new Broken())).toEqual([
      TopologyIssueKind.UnproducedFilterType,
    ]);
  });

  it('warns, without failing, when an event has no subscribers', () => {
    const topic = new TopicDef('lonely');
    class Lonely extends Topology {
      readonly topics = [topic];
      readonly queues: QueueDef[] = [];
      readonly routes = [Route.event('nobody.listens.v1').to(topic)];
    }
    const topology = new Lonely();
    expect(topology.validate()).toEqual([
      expect.objectContaining({
        kind: TopologyIssueKind.NoSubscribers,
        severity: TopologySeverity.Warning,
      }),
    ]);
    expect(() => topology.assertValid()).not.toThrow();
  });

  it('reports routes without a registered contract when contracts are provided', () => {
    const topology = new PlatformTopology();
    const issues = topology.validate({ contracts: [] });
    expect(issues.map((issue) => issue.kind)).toEqual(
      expect.arrayContaining([TopologyIssueKind.RouteWithoutContract]),
    );
    class LedgerPosted extends EventContract<{ amount: number }> {
      readonly type = 'ledger.entry.posted.v1';
      readonly schema = z.object({ amount: z.number() });
    }
    class GenerateReport extends CommandContract<{ reportId: string }> {
      readonly type = 'reports.generate.v1';
      readonly schema = z.object({ reportId: z.string() });
    }
    const all = [new TaskUpdated(), new LedgerPosted(), new GenerateReport()];
    expect(topology.validate({ contracts: all })).toEqual([]);
    // Without the ledger and report contracts, only those two routes are reported.
    expect(
      topology
        .validate({ contracts: [new TaskUpdated()] })
        .map((issue) => issue.message),
    ).toEqual([
      expect.stringContaining('"ledger.entry.posted.v1"'),
      expect.stringContaining('"reports.generate.v1"'),
    ]);
  });

  it('assertValid throws a TopologyError carrying every error issue', () => {
    class Broken extends Topology {
      readonly topics = [new TopicDef('a'), new TopicDef('a')];
      readonly queues: QueueDef[] = [];
      readonly routes: never[] = [];
    }
    expect(() => new Broken().assertValid()).toThrow(TopologyError);
  });
});

describe('Topology routing and export', () => {
  it('resolves routes by message type and keeps the contract of contract-based routes', () => {
    const topology = new PlatformTopology();
    expect(topology.routeFor('tasks.task.updated.v1')).toMatchObject({
      kind: MessageKind.Event,
      targetKind: TargetKind.Topic,
      contract: expect.any(TaskUpdated),
    });
    expect(topology.routeFor('ledger.entry.posted.v1')?.contract).toBeNull();
    expect(topology.routeFor('unknown')).toBeUndefined();
  });

  it('exports the canonical JSON with stable ordering', () => {
    expect(new PlatformTopology().toJSON()).toEqual({
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
          type: 'reports.generate.v1',
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
    expect(JSON.parse(JSON.stringify(new PlatformTopology()))).toEqual(
      new PlatformTopology().toJSON(),
    );

    class Broken extends Topology {
      readonly topics = [new TopicDef('a'), new TopicDef('a')];
      readonly queues: QueueDef[] = [];
      readonly routes: never[] = [];
    }
    expect(() => new Broken().toJSON()).toThrow(TopologyError);
  });
});
