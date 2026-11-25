import {
  defineCommand,
  defineCommandReference,
  defineTopicReference,
  defineEvent,
  defineQueue,
  defineServiceContract,
  defineTopic,
} from '@contracts/platform';
import { BackoffStrategy } from '@platform/primitives';
import { z } from 'zod';
import { MessageKind } from '../../contracts/message-contract.js';
import { topologyFromContracts } from '../contract-topology.js';
import { TargetKind } from '../target-kind.enum.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';

const TaskCreated = defineEvent({
  type: 'tasks.task.created.v1',
  payload: z.object({ taskId: z.string() }),
  description: 'A task was created.',
});
const TaskClosed = defineEvent({
  type: 'tasks.task.closed.v1',
  payload: z.object({ taskId: z.string() }),
  description: 'A task was closed.',
});
const TasksEvents = defineTopic({
  name: 'tasks-events',
  events: [TaskCreated, TaskClosed],
  description: 'Tasks events.',
});
const tasks = defineServiceContract({
  service: 'tasks',
  description: 'Tareas.',
  events: { taskCreated: TaskCreated, taskClosed: TaskClosed },
  topics: { tasksEvents: TasksEvents },
});

const GenerateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: z.object({ reportId: z.string() }),
  description: 'Generates a report.',
});
const reports = defineServiceContract({
  service: 'reports',
  description: 'Reportes.',
  commands: { generateReport: GenerateReport },
  queues: {
    reportsWork: defineQueue({
      name: 'reports-work',
      visibilityTimeoutSeconds: 120,
      retry: { maxAttempts: 3, baseMs: 500, maxMs: 10_000 },
      deadLetter: { maxReceiveCount: 4, retentionDays: 7 },
      commands: [GenerateReport],
      subscriptions: [{ topic: TasksEvents, events: [TaskClosed] }],
      description: 'Report jobs.',
    }),
  },
  sends: [GenerateReport],
});

const notifications = defineServiceContract({
  service: 'notifications',
  description: 'Alerts.',
  queues: {
    notificationsInbox: defineQueue({
      name: 'notifications-inbox',
      subscriptions: [{ topic: TasksEvents }],
      description: 'Events that produce notices.',
    }),
  },
  sends: [GenerateReport],
});

describe('topologyFromContracts', () => {
  it('builds topics, queues and typed routes from the contracts', () => {
    const topology = topologyFromContracts([tasks, reports]);

    expect(topology.topics.map((t) => [t.name, t.fifo])).toEqual([
      ['tasks-events', false],
    ]);
    const queue = topology.queueFor('reports-work');
    expect(queue).toBeDefined();
    expect(queue?.visibilityTimeoutSeconds).toBe(120);
    expect(queue?.retryPolicy).toMatchObject({
      maxAttempts: 3,
      baseMs: 500,
      maxMs: 10_000,
      strategy: BackoffStrategy.FullJitter,
    });
    expect(queue?.deadLetterConfig).toEqual({
      maxReceiveCount: 4,
      retentionDays: 7,
    });
    expect(queue?.subscriptions).toEqual([
      {
        topic: topology.topics[0],
        filterTypes: ['tasks.task.closed.v1'],
      },
    ]);

    expect(topology.routeFor(TaskCreated.type)).toMatchObject({
      kind: MessageKind.Event,
      targetKind: TargetKind.Topic,
      contract: TaskCreated,
    });
    expect(topology.routeFor(GenerateReport.type)).toMatchObject({
      kind: MessageKind.Command,
      targetKind: TargetKind.Queue,
      contract: GenerateReport,
    });
    expect(topology.validate()).toEqual([]);
  });

  it('declares the topic of a subscription even without its owner contract', () => {
    const topology = topologyFromContracts([reports]);
    expect(topology.topics.map((t) => t.name)).toEqual(['tasks-events']);
    expect(topology.routeFor(TaskClosed.type)?.contract).toBe(TaskClosed);
  });

  it('exports the same shape as a hand-written topology', () => {
    const document = topologyFromContracts([tasks, reports]).toJSON();
    expect(document.queues).toEqual([
      {
        name: 'reports-work',
        fifo: false,
        visibilityTimeoutSeconds: 120,
        maxAttempts: 3,
        dlq: {
          name: 'reports-work-dlq',
          maxReceiveCount: 4,
          retentionSeconds: 7 * 86_400,
        },
        subscriptions: [
          { topic: 'tasks-events', filterTypes: ['tasks.task.closed.v1'] },
        ],
      },
    ]);
  });

  it('accepts a sent command declared as a reference to the command of another contract', () => {
    const GenerateReportReference = defineCommandReference({
      type: GenerateReport.type,
      description: 'Requests a report.',
    });
    const billing = defineServiceContract({
      service: 'billing',
      description: 'Charges.',
      sends: [GenerateReportReference],
    });

    expect(() => topologyFromContracts([billing, reports])).not.toThrow();
    expect(() => topologyFromContracts([billing])).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidTopology }),
    );
  });

  it('declares a topic once when its owner and a subscriber by reference are both given', () => {
    const TasksEventsReference = defineTopicReference({
      name: TasksEvents.name,
      events: [TaskCreated.type],
      description: 'Task events.',
    });
    const audit = defineServiceContract({
      service: 'audit',
      description: 'Audit.',
      queues: {
        auditTasks: defineQueue({
          name: 'audit-tasks',
          subscriptions: [{ topic: TasksEventsReference }],
          description: 'Task events to audit.',
        }),
      },
    });

    const topology = topologyFromContracts([tasks, audit]);

    expect(
      topology.topics.filter((topic) => topic.name === TasksEvents.name),
    ).toHaveLength(1);
  });

  it('fails when a sent command has no queue in the given contracts', () => {
    expect(() => topologyFromContracts([tasks, notifications])).toThrow(
      expect.objectContaining({
        code: MessagingErrorCode.InvalidTopology,
        message: expect.stringContaining('reports.report.generate.v1'),
      }),
    );
    expect(() =>
      topologyFromContracts([tasks, notifications, reports]),
    ).not.toThrow();
  });
});
