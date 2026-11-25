import {
  defineCommand,
  defineEvent,
  defineQueue,
  defineServiceContract,
  defineTopic,
} from '@contracts/platform';
import { z } from 'zod';

/** Test contracts: a tasks service, a reports service and a ledger service. */
export const TaskClosed = defineEvent({
  type: 'tasks.task.closed.v1',
  payload: z.object({ taskId: z.string() }),
  description: 'A task was closed.',
});
export const TaskReopened = defineEvent({
  type: 'tasks.task.reopened.v1',
  payload: z.object({ taskId: z.string() }),
  description: 'A task was reopened.',
});
export const TasksEvents = defineTopic({
  name: 'tasks-events',
  events: [TaskClosed, TaskReopened],
  description: 'Tasks events.',
});
export const LedgerPosted = defineEvent({
  type: 'ledger.entry.posted.v1',
  payload: z.object({ accountId: z.string(), amount: z.number() }),
  description: 'Entry recorded.',
});
export const LedgerEvents = defineTopic({
  name: 'ledger-events',
  fifo: true,
  events: [LedgerPosted],
  description: 'Entries in order per account.',
});
export const GenerateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: z.object({ reportId: z.string() }),
  description: 'Generates a report.',
});

export const tasksContract = defineServiceContract({
  service: 'tasks',
  description: 'Tareas.',
  events: { taskClosed: TaskClosed, taskReopened: TaskReopened },
  topics: { tasksEvents: TasksEvents },
});

export const reportsContract = defineServiceContract({
  service: 'reports',
  description: 'Reportes.',
  commands: { generateReport: GenerateReport },
  queues: {
    reportsWork: defineQueue({
      name: 'reports-work',
      visibilityTimeoutSeconds: 30,
      retry: { maxAttempts: 3, baseMs: 2_000, maxMs: 2_000 },
      commands: [GenerateReport],
      subscriptions: [{ topic: TasksEvents, events: [TaskClosed] }],
      description: 'Report jobs.',
    }),
  },
});

export const ledgerContract = defineServiceContract({
  service: 'ledger',
  description: 'Ledger.',
  events: { ledgerPosted: LedgerPosted },
  topics: { ledgerEvents: LedgerEvents },
  queues: {
    ledgerProjection: defineQueue({
      name: 'ledger-projection',
      fifo: true,
      retry: { maxAttempts: 3, baseMs: 1_000, maxMs: 1_000 },
      subscriptions: [{ topic: LedgerEvents }],
      description: 'Ordered projection.',
    }),
  },
});
