/** What a `login_attempts` maintenance pass left behind. */
export interface LoginAttemptRetentionReport {
  /** Dropped partitions per shard. */
  readonly dropped: readonly string[];
  /** Shards that failed: the next pass retries them. */
  readonly failedShards: readonly string[];
}

/** 12-month retention of the sign-in attempt log, on all shards. */
export abstract class LoginAttemptRetention {
  abstract maintain(now: Date): Promise<LoginAttemptRetentionReport>;
}
