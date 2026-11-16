import {
  JobScheduleKind,
  ScheduledJob,
  type Clock,
  type IntervalJobSchedule,
  type PurgeableStore,
} from '@platform/kernel';
import { InternalApiJob } from './internal-api-job.enum.js';

/** Borra del almacén de idempotencia los resultados terminados hace más de `retentionMs`. */
export class ProcessedOperationRetentionJob extends ScheduledJob {
  /** Cuánto se conserva un resultado guardado: 7 días, más que cualquier reintento razonable. */
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

  /** Borra con `store.purgeCompleted(ahora - retentionMs)`. */
  override async run(): Promise<void> {
    await this.store.purgeCompleted(
      new Date(this.clock.now().getTime() - this.retentionMs),
    );
  }
}
