import { IdempotencyStore } from '@platform/kernel';
import type { FinalOutcome } from '@platform/primitives';

/**
 * Router idempotency store: the three-state port with fencing,
 * which stores final results (success or declared business error). A
 * production store writes `complete` in the same unit of work as
 * the handler effects, so a result is stored if and only if its
 * effects were committed. It is the module injection token.
 */
export abstract class ProcessedOperationStore extends IdempotencyStore<
  FinalOutcome<unknown>
> {
  /**
   * Extends to `leaseUntilMs` the lease of an in-progress claim that still belongs to `claimToken`, without shortening it. The
   * server calls it while the handler runs, so another attempt only takes the key if the owning process stopped
   * renewing it. Returns `false` if the claim already finished or another attempt took it.
   * @param key Store key.
   * @param claimToken Token of the claim.
   * @param leaseUntilMs New lease end.
   * @returns Whether it was renewed.
   */
  abstract renew(
    key: string,
    claimToken: string,
    leaseUntilMs: number,
  ): Promise<boolean>;
}
