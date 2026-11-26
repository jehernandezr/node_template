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

/** Collaborators of `SagaRecoveryJob`. */
export interface SagaRecoveryJobDeps {
  readonly engine: Pick<SagaEngine, 'resume'>;
  readonly store: SagaStore;
  readonly scopes: SagaScopes;
  readonly settings: SagaSettings;
  readonly clock: Clock;
  readonly logger?: LoggerPort;
}

/** Resumes the sagas that were left without a run or that are due for a retry. */
export class SagaRecoveryJob extends ScheduledJob {
  /** Contention errors: another run holds the saga, so it is not a failure. */
  private static readonly CONTENTION: ReadonlySet<string> = new Set([
    SagaErrorCode.ConcurrentModification,
    SagaErrorCode.LeaseNotAcquired,
    SagaErrorCode.LeaseLost,
  ]);

  /**
   * Well below the default lease (30 s): an orphaned saga is resumed
   * shortly after its lease expires, without polling the database all the time.
   */
  static readonly EVERY_MS = 5_000;
  /** Staggers the passes of several nodes so they do not query the database at the same time. */
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

  /** One pass: `runOnce(settings.recoveryBatchSize)`. */
  override async run(): Promise<void> {
    await this.runOnce(this.deps.settings.recoveryBatchSize);
  }

  /**
   * Resumes up to `limit` recoverable sagas. An error in one is logged and the
   * batch continues; those held by another run (contention) are skipped.
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
