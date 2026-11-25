import {
  JobScheduleKind,
  ScheduledJob,
  type Clock,
  type JobSchedule,
} from '@platform/kernel';
import type { SagaSettings } from '../engine/saga-settings.js';
import type { SagaStore } from '../store/saga-store.js';
import { SagaJob } from './saga-job.enum.js';

/** Deletes the sagas that finished successfully more than `settings.retentionMs` ago. */
export class SagaRetentionJob extends ScheduledJob {
  /** Retention is measured in days: purging every hour is enough and keeps each batch small. */
  static readonly EVERY_MS = 3_600_000;
  /** Staggers the passes of several nodes so they do not delete at the same time. */
  static readonly JITTER_RATIO = 0.1;

  readonly name = SagaJob.Retention;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: SagaRetentionJob.EVERY_MS,
    jitterRatio: SagaRetentionJob.JITTER_RATIO,
  };

  constructor(
    private readonly store: SagaStore,
    private readonly settings: SagaSettings,
    private readonly clock: Clock,
  ) {
    super();
  }

  /** Purges the `Completed` or `Compensated` sagas older than `now - retentionMs`. */
  async run(): Promise<void> {
    await this.store.purge({
      before: new Date(this.clock.now().getTime() - this.settings.retentionMs),
    });
  }
}
