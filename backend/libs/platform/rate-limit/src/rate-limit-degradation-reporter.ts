import type { RateLimitOperation } from './rate-limit-operation.enum.js';
import type { RateLimitRule } from './rate-limit-rule.js';

/** Receives each failure of the shared limiter to log or measure it. */
export abstract class RateLimitDegradationReporter {
  /** Called when the shared limiter fails and the local one is used. */
  abstract degraded(
    operation: RateLimitOperation,
    rule: RateLimitRule,
    error: unknown,
  ): void;
}
