import type { TenantMove } from './tenant-move.js';

/** Tenant move log in the catalog. */
export abstract class TenantMoveLog {
  /** Records a move in progress. Returns `false` if the tenant already has another one in progress. */
  abstract start(move: TenantMove): Promise<boolean>;

  /** The tenant's move in progress, if any. */
  abstract runningFor(tenantId: string): Promise<TenantMove | undefined>;

  /** Moves an ongoing move to `Switched`; repeating it keeps the first instant. */
  abstract markSwitched(moveId: string, at: Date): Promise<void>;

  /** Moves an ongoing move to `Aborted`. */
  abstract markAborted(moveId: string): Promise<void>;

  /** Moves a move whose directory was already switched to `CleanedUp`. */
  abstract markCleanedUp(moveId: string): Promise<void>;

  /** Records when cleaning a move's source was attempted, so the next run gives others a turn. */
  abstract markCleanupAttempted(moveId: string, at: Date): Promise<void>;

  /**
   * Moves switched before `before` and not yet cleaned: first those never attempted and then those
   * that have gone longest without an attempt.
   */
  abstract switchedBefore(
    before: Date,
    limit: number,
  ): Promise<readonly TenantMove[]>;
}
