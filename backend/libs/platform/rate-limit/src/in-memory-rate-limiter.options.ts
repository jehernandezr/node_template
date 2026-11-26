import type { Clock } from '@platform/kernel';

/** Options of {@link InMemoryRateLimiter}. */
export interface InMemoryRateLimiterOptions {
  /** Time source. In tests, `FixedClock` from `@platform/kernel/test-utils`. */
  readonly clock: Clock;
  /**
   * Maximum number of keys it stores. When exceeded it forgets the least recently used one,
   * which starts again from zero: this way a burst of distinct keys does not exhaust
   * the process memory. Defaults to {@link InMemoryRateLimiter.DEFAULT_MAX_ENTRIES}.
   */
  readonly maxEntries?: number;
}
