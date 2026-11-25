import type { RateLimitResult } from './rate-limit-result.js';
import type { RateLimitRule } from './rate-limit-rule.js';

/**
 * Per-key rate limit port with a sliding window. The
 * implementations validate with `RateLimitCallValidator.validate` and throw
 * `InvalidArgumentError` before counting anything.
 */
export abstract class RateLimiter {
  /**
   * Counts `cost` units if they fit in the limit. A rejected operation does not
   * count, so insisting does not lengthen the wait.
   * @param cost Units of the operation, from 1 to `rule.limit`. Defaults to 1.
   */
  abstract consume(
    key: string,
    rule: RateLimitRule,
    cost?: number,
  ): Promise<RateLimitResult>;

  /** What `consume` would return with cost 1, without counting. */
  abstract peek(key: string, rule: RateLimitRule): Promise<RateLimitResult>;

  /** Deletes what was counted for the key in that rule. */
  abstract reset(key: string, rule: RateLimitRule): Promise<void>;
}
