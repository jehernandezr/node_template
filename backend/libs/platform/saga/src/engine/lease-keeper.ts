import type { Clock, IdGenerator } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import type { Deadline } from '@platform/primitives';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { SagaStore } from '../store/saga-store.js';
import type { SagaRun } from './saga-run.js';
import type { SagaSettings } from './saga-settings.js';

/** Takes, renews and releases a saga's lease for a run. */
export class LeaseKeeper {
  constructor(
    private readonly store: SagaStore,
    private readonly settings: SagaSettings,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly logger?: LoggerPort,
  ) {}

  /** New run for `sagaId`, with a token nobody else has. */
  newRun(sagaId: string): SagaRun {
    return {
      sagaId,
      token: `${this.settings.owner}:${this.ids.next().toString()}`,
    };
  }

  /** Returns until when a lease taken at `now` lasts. */
  leaseUntil(now: Date): Date {
    return new Date(now.getTime() + this.settings.leaseMs);
  }

  /**
   * Takes the lease of the run.
   * @throws SagaError `NotFound` if the saga does not exist and `LeaseNotAcquired` if another run holds it.
   */
  async acquire(run: SagaRun): Promise<void> {
    const now = this.clock.now();
    const acquired = await this.store.tryAcquireLease(
      run.sagaId,
      run.token,
      this.leaseUntil(now),
      now,
    );
    if (acquired) {
      return;
    }
    if ((await this.store.get(run.sagaId)) === null) {
      throw new SagaError(
        SagaErrorCode.NotFound,
        `Saga ${run.sagaId} not found`,
      );
    }
    throw new SagaError(
      SagaErrorCode.LeaseNotAcquired,
      `Saga ${run.sagaId} is leased by another run`,
    );
  }

  /**
   * Extends the lease beyond the step's deadline. If it was lost, it stops without writing.
   * @throws SagaError `LeaseLost`
   */
  async renewPast(run: SagaRun, deadline: Deadline): Promise<void> {
    const renewed = await this.store.renewLease(
      run.sagaId,
      run.token,
      new Date(
        deadline.atMs + this.settings.leaseMs - this.settings.maxStepDurationMs,
      ),
    );
    if (!renewed) {
      throw new SagaError(
        SagaErrorCode.LeaseLost,
        `Lease on saga ${run.sagaId} was lost`,
      );
    }
  }

  async release(run: SagaRun): Promise<void> {
    await this.store.releaseLease(run.sagaId, run.token);
  }

  /** Releases the lease after a failed run; the original error is what the caller needs. */
  async releaseQuietly(run: SagaRun): Promise<void> {
    try {
      await this.release(run);
    } catch (error) {
      this.logger?.warn('saga lease release failed', {
        sagaId: run.sagaId,
        error,
      });
    }
  }
}
