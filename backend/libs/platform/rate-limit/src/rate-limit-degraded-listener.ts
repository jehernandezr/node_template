import type { RateLimitOperation } from './rate-limit-operation.enum.js';
import type { RateLimitRule } from './rate-limit-rule.js';

/** Aviso de que el limitador compartido falló y respondió el local. */
export type RateLimitDegradedListener = (
  operation: RateLimitOperation,
  rule: RateLimitRule,
  error: unknown,
) => void;
