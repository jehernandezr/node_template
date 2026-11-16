import { PlatformErrorCode } from '@contracts/platform';
import {
  JobScheduleKind,
  PlatformError,
  ScheduledJob,
  type Clock,
  type JobSchedule,
} from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import type { SagaEngine } from '../engine/saga-engine.js';
import type { SagaSettings } from '../engine/saga-settings.js';
import { ErrorDetail } from '../model/error-detail.js';
import type { SagaScopes } from '../store/saga-scopes.js';
import type { SagaStore } from '../store/saga-store.js';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { RecoveryFailure, RecoveryReport } from './recovery-report.js';
import { SagaJob } from './saga-job.enum.js';

/** Colaboradores de `SagaRecoveryJob`. */
export interface SagaRecoveryJobDeps {
  readonly engine: Pick<SagaEngine, 'resume'>;
  readonly store: SagaStore;
  readonly scopes: SagaScopes;
  readonly settings: SagaSettings;
  readonly clock: Clock;
  readonly logger?: LoggerPort;
}

/** Retoma las sagas que se quedaron sin corrida o que ya toca reintentar. */
export class SagaRecoveryJob extends ScheduledJob {
  /** Errores de contención: otra corrida tiene la saga, así que no es un fallo. */
  private static readonly CONTENTION: ReadonlySet<string> = new Set([
    SagaErrorCode.ConcurrentModification,
    SagaErrorCode.LeaseNotAcquired,
    SagaErrorCode.LeaseLost,
  ]);

  /**
   * Muy por debajo del lease por defecto (30 s): una saga huérfana se retoma
   * poco después de vencer su lease, sin sondear la base a cada instante.
   */
  static readonly EVERY_MS = 5_000;
  /** Desfasa las pasadas de varios nodos para que no consulten la base a la vez. */
  static readonly JITTER_RATIO = 0.1;

  readonly name = SagaJob.Recovery;
  readonly schedule: JobSchedule = {
    kind: JobScheduleKind.Interval,
    everyMs: SagaRecoveryJob.EVERY_MS,
    jitterRatio: SagaRecoveryJob.JITTER_RATIO,
  };

  constructor(private readonly deps: SagaRecoveryJobDeps) {
    super();
  }

  /** Una pasada: `runOnce(settings.recoveryBatchSize)`. */
  async run(): Promise<void> {
    await this.runOnce(this.deps.settings.recoveryBatchSize);
  }

  /**
   * Retoma hasta `limit` sagas recuperables. Un error en una se registra y el
   * lote sigue; las que otra corrida tiene (contención) se saltan.
   */
  async runOnce(limit: number): Promise<RecoveryReport> {
    const candidates = await this.deps.store.findRecoverable(
      this.deps.clock.now(),
      limit,
    );
    const resumed: string[] = [];
    const failed: RecoveryFailure[] = [];
    for (const candidate of candidates) {
      try {
        await this.deps.scopes.run(candidate, () =>
          this.deps.engine.resume(candidate.id),
        );
        resumed.push(candidate.id);
      } catch (error) {
        const code = error instanceof SagaError ? error.code : undefined;
        if (code !== undefined && SagaRecoveryJob.CONTENTION.has(code)) {
          continue;
        }
        const errorCode =
          error instanceof PlatformError
            ? error.code
            : PlatformErrorCode.InternalUnexpected;
        this.deps.logger?.error('saga recovery failed', {
          sagaId: candidate.id,
          errorCode,
          error,
        });
        failed.push({
          sagaId: candidate.id,
          errorCode,
          detail: ErrorDetail.of(error),
        });
      }
    }
    return { resumed, failed };
  }
}
