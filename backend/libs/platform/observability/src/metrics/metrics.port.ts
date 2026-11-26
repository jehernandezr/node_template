import type { MetricAttributes } from './metric-attributes.js';

/**
 * Metrics port. Platform libraries publish through it without
 * depending on OpenTelemetry.
 */
export abstract class MetricsPort {
  /**
   * Adds `value` (1 by default) to a counter.
   * @param name Counter name.
   * @param attributes Attributes of the measurement.
   * @param value Amount to add.
   */
  abstract increment(
    name: string,
    attributes?: MetricAttributes,
    value?: number,
  ): void;

  /**
   * Records a measurement in a histogram (latencies, sizes).
   * @param name Histogram name.
   * @param value Measured value.
   * @param attributes Attributes of the measurement.
   */
  abstract record(
    name: string,
    value: number,
    attributes?: MetricAttributes,
  ): void;
}
