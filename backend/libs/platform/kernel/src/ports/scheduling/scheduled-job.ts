import type { JobContext } from './job-context.js';
import type { JobSchedule } from './job-schedule.js';

/**
 * Periodic work of a library or a service. It is run by the
 * `JobRunner` of `@platform/scheduling`; the owning library only declares the
 * class, without depending on the scheduler or on NestJS.
 */
export abstract class ScheduledJob {
  /** Value of an enum of the owning library, for example `MessagingJob.OutboxRelay`. */
  abstract readonly name: string;

  abstract readonly schedule: JobSchedule;

  /** `true`: only one process in the cluster runs it at a time, with `JobLock`. */
  readonly exclusive: boolean = false;

  /** Maximum duration of a run; when it runs out, its `signal` is aborted. */
  readonly timeoutMs: number = 60_000;

  /**
   * Runs one pass of the job; it must stop when `context.signal` aborts.
   * @param context Signal and deadline of the run.
   */
  abstract run(context: JobContext): Promise<void>;
}
