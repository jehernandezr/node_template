import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { OutboxStore } from '../outbox/outbox-store.js';
import { MessagingJob } from './messaging-job.enum.js';

/** Borra del outbox los registros publicados hace más de `retentionMs`. Corre cada hora. */
export class OutboxRetentionJob extends ScheduledJob {
  readonly name = MessagingJob.OutboxRetention;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: 3_600_000,
    jitterRatio: 0.1,
  };

  constructor(
    private readonly store: OutboxStore,
    private readonly clock: Clock,
    private readonly retentionMs: number,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.store.purge({
      before: new Date(this.clock.now().getTime() - this.retentionMs),
    });
  }
}
