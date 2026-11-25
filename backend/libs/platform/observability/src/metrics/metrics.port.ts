import type { MetricAttributes } from './metric-attributes.js';

/**
 * Metrics port. Platform libraries publish through it without
 * depending on OpenTelemetry.
 */
export abstract class MetricsPort {
  /** Adds `value` (1 by default) to a counter. */
  abstract increment(
    name: string,
    attributes?: MetricAttributes,
    value?: number,
  ): void;

  /** Records a measurement in a histogram (latencies, sizes). */
  abstract record(
    name: string,
    value: number,
    attributes?: MetricAttributes,
  ): void;
}
