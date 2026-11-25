import { ErrorDescriptor } from '@platform/kernel';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import { RateLimitDegradationReporter } from './rate-limit-degradation-reporter.js';
import { RateLimitMetricAttribute } from './rate-limit-metric-attribute.enum.js';
import { RateLimitMetricName } from './rate-limit-metric-name.enum.js';
import type { RateLimitOperation } from './rate-limit-operation.enum.js';
import type { RateLimitRule } from './rate-limit-rule.js';

/** Records limiter failures as a metric and as a warning in the log. */
export class ObservabilityRateLimitDegradationReporter extends RateLimitDegradationReporter {
  constructor(
    private readonly metrics?: MetricsPort,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  degraded(
    operation: RateLimitOperation,
    rule: RateLimitRule,
    error: unknown,
  ): void {
    const description = ErrorDescriptor.describe(error);
    this.metrics?.increment(RateLimitMetricName.Degraded, {
      [RateLimitMetricAttribute.Operation]: operation,
      [RateLimitMetricAttribute.Rule]: rule.name,
      [RateLimitMetricAttribute.ErrorName]: description.name,
      ...(description.code === undefined
        ? {}
        : { [RateLimitMetricAttribute.ErrorCode]: description.code }),
    });
    this.logger?.warn('Rate limiter degraded to local mode', {
      operation,
      rule: rule.name,
      errorName: description.name,
      errorCode: description.code,
    });
  }
}
