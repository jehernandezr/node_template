import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Password checks and credential setup that sign-in, registration and account erasure use from `passwords`. */
export abstract class PasswordsFacade {
  /**
   * Verifies a password. Without `ref` (a user that does not exist) it compares against a fixed hash, so the
   * response time does not reveal whether the email exists, and returns `false`.
   * @param ref User, or `undefined` when the email has no account.
   * @param password Password to verify.
   * @returns Whether the password is the user's.
   */
  abstract verify(ref: UserRef | undefined, password: string): Promise<boolean>;

  /**
   * Stores the first password of a user.
   * @param ref User.
   * @param password Password already accepted.
   */
  abstract setInitial(ref: UserRef, password: string): Promise<void>;

  /**
   * Checks a new password without storing it.
   * @param password New password.
   * @param email Email of the account, which the password must not contain.
   * @throws IdentityError `IDENTITY.PASSWORD.POLICY_VIOLATION` or `IDENTITY.PASSWORD.BREACHED`.
   */
  abstract assertAcceptable(password: string, email: string): Promise<void>;

  /**
   * Deletes the password of a user whose account is being erased.
   * @param ref User.
   */
  abstract forget(ref: UserRef): Promise<void>;
}
