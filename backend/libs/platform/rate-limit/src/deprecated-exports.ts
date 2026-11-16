import { InMemoryRateLimiter } from './in-memory-rate-limiter.js';
import { RateLimitLimits } from './rate-limit-limits.js';
import { RateLimitCallValidator } from './rate-limit-call-validator.js';
import { RateLimitRule } from './rate-limit-rule.js';
import { SlidingWindow } from './sliding-window.js';

/**
 * @deprecated Usa `RateLimitCallValidator.validate`.
 */
export const assertRateLimitCall = RateLimitCallValidator.validate;

/**
 * @deprecated Usa `RateLimitRule.validate`.
 */
export const assertRateLimitRule = RateLimitRule.validate;

/**
 * @deprecated Usa `RateLimitRule.define`.
 */
export const defineRateLimitRule = RateLimitRule.define;

/**
 * @deprecated Usa `SlidingWindow.position`.
 */
export const windowPosition = SlidingWindow.position;

/**
 * @deprecated Usa `SlidingWindow.admits`.
 */
export const admits = SlidingWindow.admits;

/**
 * @deprecated Usa `SlidingWindow.result`.
 */
export const slidingWindowResult = SlidingWindow.result;

/**
 * @deprecated Usa `RateLimitLimits.RULE_NAME_PATTERN`.
 */
export const RATE_LIMIT_RULE_NAME_PATTERN = RateLimitLimits.RULE_NAME_PATTERN;

/**
 * @deprecated Usa `RateLimitLimits.MAX_LIMIT`.
 */
export const RATE_LIMIT_MAX_LIMIT = RateLimitLimits.MAX_LIMIT;

/**
 * @deprecated Usa `RateLimitLimits.MAX_WINDOW_MS`.
 */
export const RATE_LIMIT_MAX_WINDOW_MS = RateLimitLimits.MAX_WINDOW_MS;

/**
 * @deprecated Usa `RateLimitLimits.MAX_KEY_LENGTH`.
 */
export const RATE_LIMIT_MAX_KEY_LENGTH = RateLimitLimits.MAX_KEY_LENGTH;

/**
 * @deprecated Usa `InMemoryRateLimiter.DEFAULT_MAX_ENTRIES`.
 */
export const DEFAULT_IN_MEMORY_RATE_LIMIT_ENTRIES =
  InMemoryRateLimiter.DEFAULT_MAX_ENTRIES;
