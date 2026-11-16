import * as exported from '../index.js';
import { InMemoryRateLimiter } from '../in-memory-rate-limiter.js';
import { RateLimitLimits } from '../rate-limit-limits.js';
import { RateLimitCallValidator } from '../rate-limit-call-validator.js';
import { RateLimitRule } from '../rate-limit-rule.js';
import { SlidingWindow } from '../sliding-window.js';

describe('deprecated exports', () => {
  it.each([
    [
      'assertRateLimitCall',
      exported.assertRateLimitCall,
      RateLimitCallValidator.validate,
    ],
    [
      'assertRateLimitRule',
      exported.assertRateLimitRule,
      RateLimitRule.validate,
    ],
    ['defineRateLimitRule', exported.defineRateLimitRule, RateLimitRule.define],
    ['windowPosition', exported.windowPosition, SlidingWindow.position],
    ['admits', exported.admits, SlidingWindow.admits],
    ['slidingWindowResult', exported.slidingWindowResult, SlidingWindow.result],
  ])('%s is the class member', (_name, alias, target) => {
    expect(alias).toBe(target);
  });

  it.each([
    [
      'RATE_LIMIT_RULE_NAME_PATTERN',
      exported.RATE_LIMIT_RULE_NAME_PATTERN,
      RateLimitLimits.RULE_NAME_PATTERN,
    ],
    [
      'RATE_LIMIT_MAX_LIMIT',
      exported.RATE_LIMIT_MAX_LIMIT,
      RateLimitLimits.MAX_LIMIT,
    ],
    [
      'RATE_LIMIT_MAX_WINDOW_MS',
      exported.RATE_LIMIT_MAX_WINDOW_MS,
      RateLimitLimits.MAX_WINDOW_MS,
    ],
    [
      'RATE_LIMIT_MAX_KEY_LENGTH',
      exported.RATE_LIMIT_MAX_KEY_LENGTH,
      RateLimitLimits.MAX_KEY_LENGTH,
    ],
    [
      'DEFAULT_IN_MEMORY_RATE_LIMIT_ENTRIES',
      exported.DEFAULT_IN_MEMORY_RATE_LIMIT_ENTRIES,
      InMemoryRateLimiter.DEFAULT_MAX_ENTRIES,
    ],
  ])('%s keeps its value', (_name, alias, target) => {
    expect(alias).toBe(target);
  });
});
