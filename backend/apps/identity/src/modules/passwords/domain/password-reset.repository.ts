import type { PasswordReset } from './password-reset.js';

/** A user's password recoveries, in their shard. The use case opens the `ShardScope`. */
export abstract class PasswordResetRepository {
  abstract insert(reset: PasswordReset): Promise<void>;

  /**
   * The recovery locked until the end of the open transaction, or `undefined` if it does not exist or belongs to
   * another user: two simultaneous confirmations of the same token cannot both use it.
   */
  abstract findForUpdate(
    userId: string,
    resetId: string,
  ): Promise<PasswordReset | undefined>;

  /** @throws OptimisticLockError if another write changed the recovery. */
  abstract update(reset: PasswordReset): Promise<void>;
}
