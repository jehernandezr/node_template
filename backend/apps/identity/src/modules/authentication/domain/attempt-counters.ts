/** Recent failures left by an attempt, each counted in its own window. */
export interface AttemptCounts {
  readonly origin: number;
  readonly account: number;
  readonly ip: number;
}

/**
 * Counts sign-in failures by origin (account plus IP), by account and by IP, each in its own
 * sliding window. It only counts: deciding a lockout belongs to `LockoutPolicy`.
 */
export abstract class AttemptCounters {
  /**
   * Counts a failure for the origin, the account and the IP.
   * @param origin Origin key.
   * @param account Account key.
   * @param ip IP of the attempt.
   * @returns The counts after the failure.
   */
  abstract recordFailure(
    origin: string,
    account: string,
    ip: string,
  ): Promise<AttemptCounts>;

  /**
   * Forgets the origin's failures: a successful sign-in or a newly activated lockout.
   * @param origin Origin key.
   */
  abstract clearOrigin(origin: string): Promise<void>;

  /**
   * Forgets the account's failures from any origin.
   * @param account Account key.
   */
  abstract clearAccount(account: string): Promise<void>;
}
