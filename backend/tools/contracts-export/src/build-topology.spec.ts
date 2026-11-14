import { z } from 'zod';
import {
  defineCommand,
  defineEvent,
  defineQueue,
  defineServiceContract,
  defineTopic,
  IdSchema,
  platformContract,
} from '@contracts/platform';
import { buildAsyncApi } from './build-asyncapi.js';
import { buildTopology } from './build-topology.js';
import { contracts } from './registry.js';

type Obj = Record<string, unknown>;

const TaskPayload = z.object({ taskId: IdSchema });
const ReportPayload = z.object({ reportId: IdSchema });

const taskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: TaskPayload,
  description: 'Se actualizó una tarea.',
});
const taskDeleted = defineEvent({
  type: 'tasks.task.deleted.v1',
  payload: TaskPayload,
  description: 'Se borró una tarea.',
});
const tasksTopic = defineTopic({
  name: 'tasks-events',
  events: [taskUpdated, taskDeleted],
  description: 'Eventos de tareas.',
});
const generateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: ReportPayload,
  description: 'Genera un reporte.',
});

const tasks = defineServiceContract({
  service: 'tasks',
  description: 'Tareas.',
  schemas: { TaskPayload },
  events: { taskUpdated, taskDeleted },
  topics: { events: tasksTopic },
  sends: [generateReport],
});
const reports = defineServiceContract({
  service: 'reports',
  description: 'Reportes.',
  schemas: { ReportPayload },
  commands: { generateReport },
  queues: {
    commands: defineQueue({
      name: 'reports-commands',
      visibilityTimeoutSeconds: 300,
      retry: { maxAttempts: 3, baseMs: 2_000, maxMs: 60_000 },
      commands: [generateReport],
      description: 'Comandos de reportes.',
    }),
  },
});
const notifications = defineServiceContract({
  service: 'notifications',
  description: 'Notificaciones.',
  queues: {
    tasksEvents: defineQueue({
      name: 'notifications-tasks-events',
      retry: { maxAttempts: 6, baseMs: 2_000, maxMs: 600_000 },
      subscriptions: [{ topic: tasksTopic, events: [taskUpdated] }],
      description: 'Eventos de tareas que notifican.',
    }),
  },
});
const sample = [platformContract, tasks, reports, notifications];

describe('buildTopology', () => {
  it('derives topics, queues, routes, producers and consumers from the contracts', () => {
    expect(buildTopology(sample)).toMatchObject({
      formatVersion: 1,
      topics: [
        {
          name: 'tasks-events',
          fifo: false,
          owner: 'tasks',
          producers: ['tasks'],
        },
      ],
      queues: [
        {
          name: 'notifications-tasks-events',
          maxAttempts: 6,
          dlq: {
            name: 'notifications-tasks-events-dlq',
            maxReceiveCount: 6,
            retentionSeconds: 1_209_600,
          },
          subscriptions: [
            { topic: 'tasks-events', filterTypes: ['tasks.task.updated.v1'] },
          ],
          consumer: 'notifications',
          producers: [],
        },
        {
          name: 'reports-commands',
          visibilityTimeoutSeconds: 300,
          retry: { maxAttempts: 3, baseMs: 2_000, maxMs: 60_000 },
          subscriptions: [],
          consumer: 'reports',
          producers: ['tasks'],
        },
      ],
      routes: [
        {
          type: 'reports.report.generate.v1',
          kind: 'command',
          target: 'reports-commands',
          targetKind: 'queue',
          owner: 'reports',
        },
        {
          type: 'tasks.task.deleted.v1',
          kind: 'event',
          target: 'tasks-events',
          targetKind: 'topic',
          owner: 'tasks',
        },
        {
          type: 'tasks.task.updated.v1',
          kind: 'event',
          target: 'tasks-events',
          targetKind: 'topic',
          owner: 'tasks',
        },
      ],
    });
  });

  it('routes the identity events to the identity topic', () => {
    const topology = buildTopology(contracts);
    expect(topology['topics']).toEqual([
      expect.objectContaining({ name: 'identity-events', owner: 'identity' }),
    ]);
    expect((topology['routes'] as Obj[]).map((r) => r['type'])).toEqual([
      'identity.session.revoked.v1',
      'identity.tokens.revoked.v1',
    ]);
  });

  it('fails when a service sends a command nobody declares', () => {
    expect(() => buildTopology([platformContract, tasks])).toThrow(
      /ningún contrato declara/,
    );
  });

  it('fails when a queue subscribes to an undeclared topic', () => {
    expect(() =>
      buildTopology([platformContract, reports, notifications]),
    ).toThrow(/se suscribe a tasks-events/);
  });
});

describe('buildAsyncApi', () => {
  const doc = buildAsyncApi(sample);

  it('documents one channel per topic and queue', () => {
    expect(Object.keys(doc['channels'] as Obj).sort()).toEqual([
      'notifications-tasks-events',
      'reports-commands',
      'tasks-events',
    ]);
    expect(doc['asyncapi']).toBe('3.0.0');
  });

  it('links each message payload to the contract.json of its owner', () => {
    const messages = (doc['components'] as Obj)['messages'] as Obj;
    expect(messages['reports.report.generate.v1']).toMatchObject({
      payload: {
        $ref: 'reports/export/contract.json#/schemas/ReportPayload',
      },
      'x-kind': 'command',
      'x-owner': 'reports',
    });
  });

  it('declares who sends and who receives each queue', () => {
    const operations = doc['operations'] as Obj;
    expect(operations['reports-commands.send']).toMatchObject({
      action: 'send',
      'x-producers': ['tasks'],
    });
    expect(operations['notifications-tasks-events.receive']).toMatchObject({
      action: 'receive',
      'x-consumer': 'notifications',
      messages: [
        {
          $ref: '#/channels/notifications-tasks-events/messages/tasks.task.updated.v1',
        },
      ],
    });
  });
});
