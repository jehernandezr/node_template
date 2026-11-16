import {
  Clock,
  JobScheduleKind,
  ScheduledJob,
  type JobSchedule,
} from '@platform/kernel';
import { ProcessedMessageStore } from '../dispatch/processed-message-store.js';
import { MessagingJob } from './messaging-job.enum.js';

/**
 * Borra los mensajes procesados hace más de `retentionMs`. La retención debe
 * superar el tiempo máximo que la cola puede redistribuir un mensaje, o un
 * duplicado tardío se procesaría otra vez. Corre cada hora.
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

  async run(): Promise<void> {
    await this.store.purgeCompleted(
      new Date(this.clock.now().getTime() - this.retentionMs),
    );
  }
}
