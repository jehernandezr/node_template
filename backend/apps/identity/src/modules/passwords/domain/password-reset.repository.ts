import type { PasswordReset } from './password-reset.js';

/** A user's password recoveries, in their shard. The use case opens the `ShardScope`. */
export abstract class PasswordResetRepository {
  /**
   * Stores a new reset.
   * @param reset Reset to store.
   */
  abstract insert(reset: PasswordReset): Promise<void>;

  /**
   * The recovery locked until the end of the open transaction, or `undefined` if it does not exist or belongs to
   * another user: two simultaneous confirmations of the same token cannot both use it.
   * @param userId Owner.
   * @param resetId Reset to read.
   * @returns The locked reset, or `undefined`.
   */
  abstract findForUpdate(
    userId: string,
    resetId: string,
  ): Promise<PasswordReset | undefined>;

  /**
   * Saves the changes of a reset.
   * @param reset Reset read earlier and changed.
   * @throws OptimisticLockError if another write changed the recovery.
   */
  abstract update(reset: PasswordReset): Promise<void>;
}
