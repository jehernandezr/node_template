import type { TenantMoveRef } from '@contracts/platform';

/** What a service does besides moving its data when a move changes the directory or is canceled. */
export abstract class TenantMoveListener {
  /**
   * After pointing the service to the target. Retried until it completes, so it is idempotent.
   * @param move Switched move.
   */
  abstract switched(move: TenantMoveRef): Promise<void>;

  /**
   * After discarding the copy. Idempotent.
   * @param move Aborted move.
   */
  abstract aborted(move: TenantMoveRef): Promise<void>;
}
