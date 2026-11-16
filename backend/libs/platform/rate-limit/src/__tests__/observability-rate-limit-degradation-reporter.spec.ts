import { ObservabilityRateLimitDegradationReporter } from '../observability-rate-limit-degradation-reporter.js';
import { RateLimitMetricAttribute } from '../rate-limit-metric-attribute.enum.js';
import { RateLimitMetricName } from '../rate-limit-metric-name.enum.js';
import { RateLimitOperation } from '../rate-limit-operation.enum.js';
import type { RateLimitRule } from '../rate-limit-rule.js';
import {
  RecordedLogLevel,
  RecordingLogger,
  RecordingMetricsPort,
} from './utils/index.js';

const RULE: RateLimitRule = { name: 'observed', limit: 5, windowMs: 1000 };

describe('ObservabilityRateLimitDegradationReporter', () => {
  it('increments the degraded counter with the error code when it is valid', () => {
    const metrics = new RecordingMetricsPort();
    const reporter = new ObservabilityRateLimitDegradationReporter(metrics);
    const error = Object.assign(new Error('down'), {
      code: 'PLATFORM.VALKEY.DOWN',
    });
    reporter.degraded(RateLimitOperation.Consume, RULE, error);
    expect(metrics.increments).toEqual([
      {
        name: RateLimitMetricName.Degraded,
        attributes: {
          [RateLimitMetricAttribute.Operation]: RateLimitOperation.Consume,
          [RateLimitMetricAttribute.Rule]: RULE.name,
          [RateLimitMetricAttribute.ErrorName]: 'Error',
          [RateLimitMetricAttribute.ErrorCode]: 'PLATFORM.VALKEY.DOWN',
        },
        value: undefined,
      },
    ]);
  });

  it('omits the error code when the error has none valid', () => {
    const metrics = new RecordingMetricsPort();
    const reporter = new ObservabilityRateLimitDegradationReporter(metrics);
    reporter.degraded(RateLimitOperation.Peek, RULE, new Error('down'));
    expect(metrics.increments[0]?.attributes).not.toHaveProperty(
      RateLimitMetricAttribute.ErrorCode,
    );
  });

  it('writes a warning to the logger', () => {
    const logger = new RecordingLogger();
    const reporter = new ObservabilityRateLimitDegradationReporter(
      undefined,
      logger,
    );
    reporter.degraded(RateLimitOperation.Reset, RULE, new TypeError('bad'));
    expect(logger.entries).toEqual([
      {
        level: RecordedLogLevel.Warn,
        message: 'Rate limiter degraded to local mode',
        fields: {
          operation: RateLimitOperation.Reset,
          rule: RULE.name,
          errorName: 'TypeError',
          errorCode: undefined,
        },
      },
    ]);
  });

  it('does nothing without metrics or logger', () => {
    const reporter = new ObservabilityRateLimitDegradationReporter();
    expect(() =>
      reporter.degraded(RateLimitOperation.Consume, RULE, new Error('x')),
    ).not.toThrow();
  });
});
