import type { JobContext } from './job-context.js';
import type { JobSchedule } from './job-schedule.js';

/**
 * Trabajo periódico de una librería o de un servicio. Lo ejecuta el
 * `JobRunner` de `@platform/scheduling`; la librería dueña solo declara la
 * clase, sin depender del programador ni de NestJS.
 */
export abstract class ScheduledJob {
  /** Valor de un enum de la librería dueña, por ejemplo `MessagingJob.OutboxRelay`. */
  abstract readonly name: string;

  abstract readonly schedule: JobSchedule;

  /** `true`: un solo proceso del clúster la corre a la vez, con `JobLock`. */
  readonly exclusive: boolean = false;

  /** Tiempo máximo de una corrida; al agotarse se aborta su `signal`. */
  readonly timeoutMs: number = 60_000;

  abstract run(context: JobContext): Promise<void>;
}
