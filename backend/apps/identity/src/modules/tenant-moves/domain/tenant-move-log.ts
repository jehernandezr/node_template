import type { TenantMove } from './tenant-move.js';

/** Tenant move log in the catalog. */
export abstract class TenantMoveLog {
  /**
   * Records a move in progress. Returns `false` if the tenant already has another one in progress.
   * @param move Move to record.
   * @returns Whether it was recorded.
   */
  abstract start(move: TenantMove): Promise<boolean>;

  /**
   * The tenant's move in progress, if any.
   * @param tenantId Tenant to check.
   * @returns The move, or `undefined`.
   */
  abstract runningFor(tenantId: string): Promise<TenantMove | undefined>;

  /**
   * Moves an ongoing move to `Switched`; repeating it keeps the first instant.
   * @param moveId Move to mark.
   * @param at Instant of the switch.
   */
  abstract markSwitched(moveId: string, at: Date): Promise<void>;

  /**
   * Moves an ongoing move to `Aborted`.
   * @param moveId Move to mark.
   */
  abstract markAborted(moveId: string): Promise<void>;

  /**
   * Moves a move whose directory was already switched to `CleanedUp`.
   * @param moveId Move to mark.
   */
  abstract markCleanedUp(moveId: string): Promise<void>;

  /**
   * Records when cleaning a move's source was attempted, so the next run gives others a turn.
   * @param moveId Move whose cleanup was attempted.
   * @param at Instant of the attempt.
   */
  abstract markCleanupAttempted(moveId: string, at: Date): Promise<void>;

  /**
   * Moves switched before `before` and not yet cleaned: first those never attempted and then those
   * that have gone longest without an attempt.
   * @param before Instant the switch must predate.
   * @param limit Maximum to return.
   * @returns The moves to clean.
   */
  abstract switchedBefore(
    before: Date,
    limit: number,
  ): Promise<readonly TenantMove[]>;
}
