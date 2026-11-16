import {
  JobScheduleKind,
  ScheduledJob,
  type Clock,
  type JobSchedule,
} from '@platform/kernel';
import type { SagaSettings } from '../engine/saga-settings.js';
import type { SagaStore } from '../store/saga-store.js';
import { SagaJob } from './saga-job.enum.js';

/** Borra las sagas terminadas con éxito hace más de `settings.retentionMs`. */
export class SagaRetentionJob extends ScheduledJob {
  /** La retención se mide en días: purgar cada hora basta y mantiene cada lote pequeño. */
  static readonly EVERY_MS = 3_600_000;
  /** Desfasa las pasadas de varios nodos para que no borren a la vez. */
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

  /** Purga las sagas `Completed` o `Compensated` anteriores a `now - retentionMs`. */
  async run(): Promise<void> {
    await this.store.purge({
      before: new Date(this.clock.now().getTime() - this.settings.retentionMs),
    });
  }
}
