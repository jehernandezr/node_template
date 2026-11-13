import {
  defineCommand,
  defineEvent,
  defineQueue,
  defineServiceContract,
  defineTopic,
} from '@contracts/platform';
import type { LoggerPort } from '@platform/observability';
import { z } from 'zod';

/**
 * Contratos y dobles compartidos por las pruebas del adaptador. La carpeta
 * `src/test` queda fuera del build (`tsconfig.lib.json`).
 */
export const TaskClosed = defineEvent({
  type: 'tasks.task.closed.v1',
  payload: z.object({ taskId: z.string() }),
  description: 'Se cerró una tarea.',
});
export const TaskReopened = defineEvent({
  type: 'tasks.task.reopened.v1',
  payload: z.object({ taskId: z.string() }),
  description: 'Se reabrió una tarea.',
});
export const TasksEvents = defineTopic({
  name: 'tasks-events',
  events: [TaskClosed, TaskReopened],
  description: 'Eventos de tasks.',
});
export const LedgerPosted = defineEvent({
  type: 'ledger.entry.posted.v1',
  payload: z.object({ accountId: z.string(), amount: z.number() }),
  description: 'Asiento registrado.',
});
export const LedgerEvents = defineTopic({
  name: 'ledger-events',
  fifo: true,
  events: [LedgerPosted],
  description: 'Asientos en orden por cuenta.',
});
export const GenerateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: z.object({ reportId: z.string() }),
  description: 'Genera un reporte.',
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
      description: 'Trabajo de reportes.',
    }),
  },
});

export const ledgerContract = defineServiceContract({
  service: 'ledger',
  description: 'Libro mayor.',
  events: { ledgerPosted: LedgerPosted },
  topics: { ledgerEvents: LedgerEvents },
  queues: {
    ledgerProjection: defineQueue({
      name: 'ledger-projection',
      fifo: true,
      retry: { maxAttempts: 3, baseMs: 1_000, maxMs: 1_000 },
      subscriptions: [{ topic: LedgerEvents }],
      description: 'Proyección ordenada.',
    }),
  },
});

export const awsTestConfig = {
  AWS_REGION: 'us-east-1',
  AWS_ACCOUNT_ID: '000000000000',
  MESSAGING_NAME_PREFIX: 'test',
} as const;

/** Logger que guarda los mensajes, para afirmar sobre ellos. */
export class RecordingLogger implements LoggerPort {
  readonly lines: { level: string; message: string; fields?: unknown }[] = [];

  debug(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: 'debug', message, fields });
  }
  info(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: 'info', message, fields });
  }
  warn(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: 'warn', message, fields });
  }
  error(message: string, fields?: Record<string, unknown>): void {
    this.lines.push({ level: 'error', message, fields });
  }
  child(): LoggerPort {
    return this;
  }
}

/** Una llamada recibida por un cliente falso del SDK. */
export interface SentCommand {
  readonly name: string;
  readonly input: Record<string, unknown>;
}

/**
 * Cliente falso del SDK: guarda cada comando y responde con `respond`, que
 * recibe el nombre de la clase del comando y su entrada.
 */
export function fakeClient(
  respond: (
    name: string,
    input: Record<string, unknown>,
    options?: { abortSignal?: AbortSignal },
  ) => unknown = () => ({}),
) {
  const sent: SentCommand[] = [];
  const client = {
    send: jest.fn(
      async (
        command: { constructor: { name: string }; input: object },
        options?: { abortSignal?: AbortSignal },
      ) => {
        const name = command.constructor.name;
        const input = command.input as Record<string, unknown>;
        sent.push({ name, input });
        return respond(name, input, options);
      },
    ),
    destroy: jest.fn(),
  };
  return { client, sent };
}
