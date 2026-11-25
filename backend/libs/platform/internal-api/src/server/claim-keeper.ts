import type { Clock } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import { TimerScheduler } from '@platform/primitives';
import type { ClaimedOperation } from './claimed-operation.js';
import type { ClaimKeeperOptions } from './claim-keeper.options.js';
import type { ProcessedOperationStore } from './processed-operation-store.js';

/**
 * Mantiene viva la llave de idempotencia mientras corre su handler: renueva el lease cada `renewEveryMs`. Así otro
 * intento con la misma llave solo la toma si el proceso dueño dejó de renovarla, es decir, si cayó; un handler lento
 * nunca corre en paralelo con un reintento.
 */
export class ClaimKeeper {
  static readonly DEFAULT_RENEW_EVERY_MS = 2_000;
  static readonly DEFAULT_RENEWED_LEASE_MS = 10_000;

  private readonly renewEveryMs: number;
  private readonly renewedLeaseMs: number;

  constructor(
    private readonly store: ProcessedOperationStore,
    private readonly clock: Clock,
    options: ClaimKeeperOptions = {},
    private readonly logger?: LoggerPort,
  ) {
    this.renewEveryMs =
      options.renewEveryMs ?? ClaimKeeper.DEFAULT_RENEW_EVERY_MS;
    this.renewedLeaseMs =
      options.renewedLeaseMs ?? ClaimKeeper.DEFAULT_RENEWED_LEASE_MS;
  }

  /**
   * Corre `work` renovando el lease de `claimed` hasta que termina. Al terminar deja de renovar y espera la renovación
   * en vuelo, así ninguna queda suelta. Una renovación que falla no corta el trabajo: la siguiente lo vuelve a intentar.
   */
  async during<T>(
    claimed: ClaimedOperation,
    work: () => Promise<T>,
  ): Promise<T> {
    let stopped = false;
    let inFlight: Promise<void> = Promise.resolve();
    let cancel: () => void = () => undefined;
    const schedule = (): void => {
      cancel = TimerScheduler.armDetached(this.renewEveryMs, () => {
        inFlight = this.renew(claimed).then(() => {
          if (!stopped) {
            schedule();
          }
        });
      });
    };
    schedule();
    try {
      return await work();
    } finally {
      stopped = true;
      cancel();
      await inFlight;
    }
  }

  private async renew(claimed: ClaimedOperation): Promise<void> {
    try {
      await this.store.renew(
        claimed.key,
        claimed.claimToken,
        this.clock.now().getTime() + this.renewedLeaseMs,
      );
    } catch (error) {
      this.logger?.warn('idempotency lease not renewed', {
        key: claimed.key,
        error,
      });
    }
  }
}
