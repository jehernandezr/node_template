import type { RateLimitOperation } from './rate-limit-operation.enum.js';
import type { RateLimitRule } from './rate-limit-rule.js';

/** Notice that the shared limiter failed and the local one responded. */
export type RateLimitDegradedListener = (
  operation: RateLimitOperation,
  rule: RateLimitRule,
  error: unknown,
) => void;
