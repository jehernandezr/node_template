import { RateLimitDegradationReporter } from '../../rate-limit-degradation-reporter.js';
import type { RateLimitOperation } from '../../rate-limit-operation.enum.js';
import type { RateLimitRule } from '../../rate-limit-rule.js';

/** A failure received by {@link RecordingDegradationReporter}. */
export interface RecordedDegradation {
  readonly operation: RateLimitOperation;
  readonly rule: RateLimitRule;
  readonly error: unknown;
}

/** Reporter that stores each failure, for tests. */
export class RecordingDegradationReporter extends RateLimitDegradationReporter {
  readonly degradations: RecordedDegradation[] = [];

  degraded(
    operation: RateLimitOperation,
    rule: RateLimitRule,
    error: unknown,
  ): void {
    this.degradations.push({ operation, rule, error });
  }
}
