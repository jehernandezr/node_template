import type { Clock } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import { TimerScheduler } from '@platform/primitives';
import type { ClaimedOperation } from './claimed-operation.js';
import type { ClaimKeeperOptions } from './claim-keeper.options.js';
import type { ProcessedOperationStore } from './processed-operation-store.js';

/**
 * Keeps the idempotency key alive while its handler runs: renews the lease every `renewEveryMs`. This way another
 * attempt with the same key only takes it if the owning process stopped renewing it, that is, if it crashed; a slow handler
 * never runs in parallel with a retry.
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
   * Runs `work` renewing the lease of `claimed` until it finishes. When done it stops renewing and waits for the renewal
   * in flight, so none is left dangling. A failed renewal does not stop the work: the next one tries again.
   * @param claimed Claimed operation.
   * @param work Handler work.
   * @returns What `work` returns.
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
