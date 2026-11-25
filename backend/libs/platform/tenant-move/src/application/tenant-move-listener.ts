import type { TenantMoveRef } from '@contracts/platform';

/** What a service does besides moving its data when a move changes the directory or is canceled. */
export abstract class TenantMoveListener {
  /** After pointing the service to the target. Retried until it completes, so it is idempotent. */
  abstract switched(move: TenantMoveRef): Promise<void>;

  /** After discarding the copy. Idempotent. */
  abstract aborted(move: TenantMoveRef): Promise<void>;
}
