import { PlatformErrorCode } from '@contracts/platform';
import { SystemClock, type Clock } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import { SagaEngine } from '../engine/saga-engine.js';
import { errorDetail } from '../engine/transitions.js';
import { SagaError } from '../errors.js';
import { SagaStore } from '../store/saga-store.js';

/** Constructor options of `SagaRecoveryJob`. */
export interface SagaRecoveryJobOptions {
  readonly engine: SagaEngine;
  readonly store: SagaStore;
  readonly clock?: Clock;
  /** Receives every saga the job could not resume, with the error. */
  readonly logger?: LoggerPort;
}

/** A saga that the job could not resume because of an error. */
export interface RecoveryFailure {
  readonly sagaId: string;
  /** Code of the `SagaError`, or `PLATFORM.INTERNAL.UNEXPECTED` for other errors. */
  readonly errorCode: string;
  /** Code or name and message of the error, without input values. */
  readonly detail: string;
}

/** Outcome of one run of the recovery job. */
export interface RecoveryReport {
  readonly resumed: string[];
  readonly failed: RecoveryFailure[];
}

const CONTENTION: ReadonlySet<string> = new Set<string>([
  PlatformErrorCode.SagaLeaseNotAcquired,
  PlatformErrorCode.SagaLeaseLost,
  PlatformErrorCode.SagaConcurrentModification,
]);

/** Resumes sagas that were left without a worker or are due for a retry. */
export class SagaRecoveryJob {
  private readonly engine: SagaEngine;
  private readonly store: SagaStore;
  private readonly clock: Clock;
  private readonly logger: LoggerPort | undefined;

  constructor(options: SagaRecoveryJobOptions) {
    this.engine = options.engine;
    this.store = options.store;
    this.clock = options.clock ?? new SystemClock();
    this.logger = options.logger;
  }

  /**
   * Resumes up to `limit` recoverable sagas. An error in one saga is recorded
   * and logged, and the batch continues. Sagas that another run holds are
   * skipped.
   */
  async runOnce(limit = 50): Promise<RecoveryReport> {
    const candidates = await this.store.findRecoverable(
      this.clock.now(),
      limit,
    );
    const resumed: string[] = [];
    const failed: RecoveryFailure[] = [];
    for (const candidate of candidates) {
      try {
        await this.engine.resume(candidate.id);
        resumed.push(candidate.id);
      } catch (error) {
        const code = error instanceof SagaError ? error.code : undefined;
        if (code !== undefined && CONTENTION.has(code)) {
          continue;
        }
        const errorCode = code ?? PlatformErrorCode.InternalUnexpected;
        this.logger?.error('saga recovery failed', {
          sagaId: candidate.id,
          errorCode,
          error,
        });
        failed.push({
          sagaId: candidate.id,
          errorCode,
          detail: errorDetail(error),
        });
      }
    }
    return { resumed, failed };
  }
}
