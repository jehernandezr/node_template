import type { Clock } from '@platform/kernel';
import type { RateLimitDegradationReporter } from './rate-limit-degradation-reporter.js';
import type { RateLimitDegradedListener } from './rate-limit-degraded-listener.js';
import type { RateLimiter } from './rate-limiter.js';

/** Options of {@link DegradingRateLimiter}. */
export interface DegradingRateLimiterOptions {
  /** Limiter shared between instances, usually the Valkey one. */
  readonly primary: RateLimiter;
  /**
   * Divides the limit of each rule while the local limiter responds,
   * usually the number of service instances: each one counts only its own
   * traffic, and together they should not let through much more than the global limit.
   */
  readonly localDivisor: number;
  /** Local limiter. Defaults to an `InMemoryRateLimiter` with `clock`. */
  readonly fallback?: RateLimiter;
  /** Clock of the default local limiter. */
  readonly clock: Clock;
  /**
   * Called with each failure of the shared limiter. An exception inside
   * it is ignored.
   */
  readonly onDegraded?: RateLimitDegradedListener;
  /** Reports each failure. Does nothing by default. */
  readonly reporter?: RateLimitDegradationReporter;
}
