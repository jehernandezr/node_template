import {
  defineCommand,
  defineEvent,
  defineQueue,
  defineServiceContract,
  defineTopic,
} from '@contracts/platform';
import { z } from 'zod';
import { MessageKind } from '../contracts/message-contract.js';
import { MessagingErrorCode } from '../errors/messaging-error.js';
import { topologyFromContracts } from './contract-topology.js';
import { TargetKind } from './route.js';

const TaskCreated = defineEvent({
  type: 'tasks.task.created.v1',
  payload: z.object({ taskId: z.string() }),
  description: 'Se creó una tarea.',
});
const TaskClosed = defineEvent({
  type: 'tasks.task.closed.v1',
  payload: z.object({ taskId: z.string() }),
  description: 'Se cerró una tarea.',
});
const TasksEvents = defineTopic({
  name: 'tasks-events',
  events: [TaskCreated, TaskClosed],
  description: 'Eventos de tasks.',
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
  description: 'Genera un reporte.',
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
      description: 'Trabajo de reportes.',
    }),
  },
  sends: [GenerateReport],
});

const notifications = defineServiceContract({
  service: 'notifications',
  description: 'Avisos.',
  queues: {
    notificationsInbox: defineQueue({
      name: 'notifications-inbox',
      subscriptions: [{ topic: TasksEvents }],
      description: 'Eventos que generan avisos.',
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
