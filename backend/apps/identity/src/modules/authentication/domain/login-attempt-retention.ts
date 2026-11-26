/** What a `login_attempts` maintenance pass left behind. */
export interface LoginAttemptRetentionReport {
  /** Dropped partitions per shard. */
  readonly dropped: readonly string[];
  /** Shards that failed: the next pass retries them. */
  readonly failedShards: readonly string[];
}

/** 12-month retention of the sign-in attempt log, on all shards. */
export abstract class LoginAttemptRetention {
  /**
   * Creates the coming partitions of `login_attempts` and drops the expired ones in every shard.
   * @param now Current instant.
   * @returns What was created and dropped.
   */
  abstract maintain(now: Date): Promise<LoginAttemptRetentionReport>;
}
