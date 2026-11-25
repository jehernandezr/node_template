import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import { RateLimitCallValidator } from '../rate-limit-call-validator.js';
import { RateLimitRule } from '../rate-limit-rule.js';
import { RATE_LIMIT_METADATA } from './rate-limit-tokens.js';
import { RateLimitKey } from './rate-limit-key.enum.js';

/** Metadata that the decorator stores on each route. */
export interface RateLimitMetadata {
  readonly rule: RateLimitRule;
  readonly cost: number;
}

/** Writes the rule of a route. Validates when the class loads, not on the request. */
export class RateLimitMetadataWriter {
  /**
   * @throws InvalidArgumentError if the rule or the cost is not valid.
   */
  static decorate(
    rule: RateLimitRule,
    options: { readonly cost?: number } = {},
  ): CustomDecorator<symbol> {
    const frozen = RateLimitRule.define(rule);
    const cost = options.cost ?? 1;
    RateLimitCallValidator.validate(RateLimitKey.Anonymous, frozen, cost);
    return SetMetadata<symbol, RateLimitMetadata>(RATE_LIMIT_METADATA, {
      rule: frozen,
      cost,
    });
  }
}

/** `@RateLimit(rule)` decorator for routes. */
export const RateLimit = RateLimitMetadataWriter.decorate;
