import type { LoginAttempt } from './login-attempt.js';

/** Log of sign-in attempts, in the user shard. */
export abstract class LoginAttemptRepository {
  /**
   * Appends an attempt to the monthly partition of the shard in scope, for audit and lockout review.
   * @param attempt Attempt to record.
   */
  abstract record(attempt: LoginAttempt): Promise<void>;

  /**
   * Deletes every attempt of a user, whose account is being erased.
   * @param userId User.
   */
  abstract forget(userId: string): Promise<void>;
}
