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
  abstract recordFailure(
    origin: string,
    account: string,
    ip: string,
  ): Promise<AttemptCounts>;

  /** Forgets the origin's failures: a successful sign-in or a newly activated lockout. */
  abstract clearOrigin(origin: string): Promise<void>;

  /** Forgets the account's failures from any origin. */
  abstract clearAccount(account: string): Promise<void>;
}
