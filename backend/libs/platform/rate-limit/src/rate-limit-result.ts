/** Response of a limiter. */
export interface RateLimitResult {
  /** Whether the operation fits in the limit. */
  readonly allowed: boolean;
  /** Estimated units in the sliding window, rounded up. */
  readonly count: number;
  /** Units that still fit, `limit - count` and never negative. */
  readonly remaining: number;
  /**
   * Wait until the operation would fit if no more traffic arrives, in
   * milliseconds. It is 0 when `allowed` is true.
   */
  readonly retryAfterMs: number;
}
