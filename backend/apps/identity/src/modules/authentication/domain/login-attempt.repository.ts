import type { LoginAttempt } from './login-attempt.js';

/** Log of sign-in attempts, in the user shard. */
export abstract class LoginAttemptRepository {
  /**
   * Records an attempt.
   * @param attempt Attempt to record.
   */
  abstract record(attempt: LoginAttempt): Promise<void>;

  /**
   * Deletes every attempt of a user, whose account is being erased.
   * @param userId User.
   */
  abstract forget(userId: string): Promise<void>;
}
