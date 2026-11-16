import type { Clock, IdGenerator } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import type { Deadline } from '@platform/primitives';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { SagaStore } from '../store/saga-store.js';
import type { SagaRun } from './saga-run.js';
import type { SagaSettings } from './saga-settings.js';

/** Toma, renueva y suelta el lease de una saga para una corrida. */
export class LeaseKeeper {
  constructor(
    private readonly store: SagaStore,
    private readonly settings: SagaSettings,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly logger?: LoggerPort,
  ) {}

  /** Corrida nueva para `sagaId`, con un token que nadie más tiene. */
  newRun(sagaId: string): SagaRun {
    return {
      sagaId,
      token: `${this.settings.owner}:${this.ids.next().toString()}`,
    };
  }

  /** Hasta cuándo dura un lease tomado en `now`. */
  leaseUntil(now: Date): Date {
    return new Date(now.getTime() + this.settings.leaseMs);
  }

  /**
   * Toma el lease de la corrida.
   * @throws SagaError `NotFound` si la saga no existe y `LeaseNotAcquired` si otra corrida lo tiene.
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
   * Extiende el lease más allá del plazo del paso. Si se perdió, se detiene sin escribir.
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

  /** Suelta el lease tras una corrida fallida; el error original es lo que necesita quien llama. */
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
