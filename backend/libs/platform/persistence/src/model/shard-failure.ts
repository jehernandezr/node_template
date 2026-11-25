/** Shard that did not respond in time or failed during a walk. */
export interface ShardFailure {
  readonly shard: string;
  readonly timedOut: boolean;
  /** Stable error code, if it was a `PlatformError`. */
  readonly code?: string;
}
