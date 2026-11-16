import type { RateLimitOperation } from './rate-limit-operation.enum.js';
import type { RateLimitRule } from './rate-limit-rule.js';

/** Recibe cada falla del limitador compartido para registrarla o medirla. */
export abstract class RateLimitDegradationReporter {
  /** Llamado cuando el limitador compartido falla y se usa el local. */
  abstract degraded(
    operation: RateLimitOperation,
    rule: RateLimitRule,
    error: unknown,
  ): void;
}
