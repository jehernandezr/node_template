import type { RateLimitResult } from './rate-limit-result.js';
import type { RateLimitRule } from './rate-limit-rule.js';
import { RateLimiter } from './rate-limiter.js';

/**
 * The shared limiter without local degradation: when the shared store fails, every call fails with it. Security
 * counters (account lockout, MFA attempts) inject it, so an outage refuses the attempt instead of counting it in one
 * process only. `RateLimitModule` binds it to the shared limiter, or to the in-process one where there is none.
 */
export class StrictRateLimiter extends RateLimiter {
  constructor(private readonly shared: RateLimiter) {
    super();
  }

  override consume(
    key: string,
    rule: RateLimitRule,
    cost?: number,
  ): Promise<RateLimitResult> {
    return this.shared.consume(key, rule, cost);
  }

  override peek(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    return this.shared.peek(key, rule);
  }

  override reset(key: string, rule: RateLimitRule): Promise<void> {
    return this.shared.reset(key, rule);
  }
}
