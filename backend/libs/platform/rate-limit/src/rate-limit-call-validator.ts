import { InvalidArgumentError } from '@platform/primitives';
import { RateLimitArgumentGuard } from './errors/rate-limit-argument-guard.js';
import { RateLimitLimits } from './rate-limit-limits.js';
import { RateLimitRule } from './rate-limit-rule.js';

/** Validates a call to a `RateLimiter` before counting anything. */
export class RateLimitCallValidator {
  /**
   * Validates the key, the rule and the cost. The cost goes from 1 to the limit: a
   * larger one would never fit and reveals a programming error.
   * @throws InvalidArgumentError with the first invalid argument.
   */
  static validate(key: string, rule: RateLimitRule, cost = 1): void {
    if (
      typeof key !== 'string' ||
      key.length === 0 ||
      key.length > RateLimitLimits.MAX_KEY_LENGTH
    ) {
      throw new InvalidArgumentError(
        'key',
        `a string of 1 to ${RateLimitLimits.MAX_KEY_LENGTH} characters`,
      );
    }
    RateLimitRule.validate(rule);
    RateLimitArgumentGuard.instance.integerInRange('cost', cost, 1, rule.limit);
  }
}
