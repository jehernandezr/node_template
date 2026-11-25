import {
  JobScheduleKind,
  ScheduledJob,
  type Clock,
  type IntervalJobSchedule,
  type PurgeableStore,
} from '@platform/kernel';
import { InternalApiJob } from './internal-api-job.enum.js';

/** Deletes from the idempotency store the results finished more than `retentionMs` ago. */
export class ProcessedOperationRetentionJob extends ScheduledJob {
  /** How long a stored result is kept: 7 days, longer than any reasonable retry. */
  static readonly DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

  override readonly name: string = InternalApiJob.ProcessedOperationRetention;
  override readonly schedule: IntervalJobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: 60 * 60 * 1000,
    jitterRatio: 0.1,
  };
  override readonly exclusive = true;

  constructor(
    private readonly store: PurgeableStore,
    private readonly clock: Clock,
    private readonly retentionMs: number = ProcessedOperationRetentionJob.DEFAULT_RETENTION_MS,
  ) {
    super();
  }

  /** Deletes with `store.purgeCompleted(now - retentionMs)`. */
  override async run(): Promise<void> {
    await this.store.purgeCompleted(
      new Date(this.clock.now().getTime() - this.retentionMs),
    );
  }
}
