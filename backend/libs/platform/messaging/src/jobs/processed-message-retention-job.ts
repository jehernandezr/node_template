import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { ProcessedMessageStore } from '../dispatch/processed-message-store.js';
import { MessagingJob } from './messaging-job.enum.js';

/**
 * Deletes messages processed more than `retentionMs` ago. The retention must
 * exceed the maximum time the queue can redeliver a message, or a
 * late duplicate would be processed again. Runs every hour.
 */
export class ProcessedMessageRetentionJob extends ScheduledJob {
  readonly name = MessagingJob.ProcessedMessageRetention;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: 3_600_000,
    jitterRatio: 0.1,
  };

  constructor(
    private readonly store: ProcessedMessageStore,
    private readonly clock: Clock,
    private readonly retentionMs: number,
  ) {
    super();
  }

  override async run(): Promise<void> {
    await this.store.purgeCompleted(
      new Date(this.clock.now().getTime() - this.retentionMs),
    );
  }
}
