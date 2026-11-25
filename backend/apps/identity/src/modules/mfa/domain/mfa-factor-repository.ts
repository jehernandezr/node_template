import type { MfaRecovery } from './mfa-recovery.js';
import type { TotpFactor } from './totp-factor.js';

/** Second-factor data of a user, in their shard. */
export abstract class MfaFactorRepository {
  /**
   * Reads the TOTP factor of a user.
   * @param userId User.
   * @returns The factor, or `undefined` if it is not enrolled.
   */
  abstract findTotp(userId: string): Promise<TotpFactor | undefined>;

  /**
   * Stores the TOTP factor of a user.
   * @param factor Factor to store.
   */
  abstract saveTotp(factor: TotpFactor): Promise<void>;

  /**
   * Removes the TOTP factor of a user.
   * @param userId User.
   */
  abstract deleteTotp(userId: string): Promise<void>;

  /**
   * Replaces the recovery codes with the new digests.
   * @param userId User.
   * @param hashes Digests of the new codes.
   */
  abstract replaceRecoveryCodes(
    userId: string,
    hashes: readonly string[],
  ): Promise<void>;

  /**
   * Counts the unused recovery codes.
   * @param userId User.
   * @returns How many codes are left.
   */
  abstract countRecoveryCodes(userId: string): Promise<number>;

  /**
   * Marks the code with that digest as used.
   * @param userId User.
   * @param hash Digest of the code.
   * @param at Instant of use.
   * @returns `false` if it does not exist or was already used.
   */
  abstract useRecoveryCode(
    userId: string,
    hash: string,
    at: Date,
  ): Promise<boolean>;

  /**
   * Stores a new recovery without a device.
   * @param recovery Recovery to store.
   */
  abstract insertRecovery(recovery: MfaRecovery): Promise<void>;

  /**
   * Finds a recovery by the digest of its emailed token.
   * @param userId User.
   * @param tokenHash Digest of the token.
   * @returns The recovery, or `undefined` if there is none.
   */
  abstract findRecoveryByToken(
    userId: string,
    tokenHash: string,
  ): Promise<MfaRecovery | undefined>;

  /**
   * Counts the recoveries requested since an instant.
   * @param userId User.
   * @param since Start of the window.
   * @returns How many were requested.
   */
  abstract countRecoveriesSince(userId: string, since: Date): Promise<number>;

  /**
   * Updates a recovery with optimistic locking.
   * @param recovery Changed recovery.
   */
  abstract updateRecovery(recovery: MfaRecovery): Promise<void>;

  /**
   * Cancels every pending recovery of the user.
   * @param userId User who just proved a second factor.
   * @returns How many recoveries were cancelled.
   */
  abstract cancelPendingRecoveries(userId: string): Promise<number>;

  /**
   * Deletes every factor, recovery code and recovery of a user whose account is being erased.
   * @param userId User.
   */
  abstract forget(userId: string): Promise<void>;
}
