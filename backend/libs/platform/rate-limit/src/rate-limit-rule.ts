import { RateLimitArgumentGuard } from './errors/rate-limit-argument-guard.js';
import { RateLimitLimits } from './rate-limit-limits.js';

/**
 * Limit of `limit` units per sliding window of `windowMs`. The name and
 * the window identify the counters: changing a rule's limit
 * keeps what was counted, changing the window starts from zero.
 *
 * It only has read-only fields, so an object literal with the same shape
 * is also a rule; that is why validation is static and not an instance
 * method, and the limiters validate each rule they receive.
 */
export class RateLimitRule {
  private constructor(
    readonly name: string,
    readonly limit: number,
    readonly windowMs: number,
  ) {}

  /**
   * Validates and freezes a rule. Meant for declaring them as constants when
   * the module loads, so that a badly written rule fails at startup.
   * @throws InvalidArgumentError like {@link RateLimitRule.validate}.
   */
  static define(rule: RateLimitRule): RateLimitRule {
    RateLimitRule.validate(rule);
    return Object.freeze(
      new RateLimitRule(rule.name, rule.limit, rule.windowMs),
    );
  }

  /**
   * @throws InvalidArgumentError if the name does not match
   *   `RateLimitLimits.RULE_NAME_PATTERN` or the limit or the window are not
   *   integers within their range.
   */
  static validate(rule: RateLimitRule): void {
    const guard = RateLimitArgumentGuard.instance;
    guard.matches('rule.name', rule.name, RateLimitLimits.RULE_NAME_PATTERN);
    guard.integerInRange(
      'rule.limit',
      rule.limit,
      1,
      RateLimitLimits.MAX_LIMIT,
    );
    guard.integerInRange(
      'rule.windowMs',
      rule.windowMs,
      1,
      RateLimitLimits.MAX_WINDOW_MS,
    );
  }
}
