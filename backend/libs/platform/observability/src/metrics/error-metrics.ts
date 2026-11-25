import { PlatformMetric } from './platform-metric.enum.js';
import { ErrorMetricAttributes } from './error-metric-attributes.js';
import type { MetricsPort } from './metrics.port.js';

/** Counts an error by its code, to alert by code and not only by rate. */
export class ErrorMetrics {
  constructor(private readonly port: MetricsPort) {}

  record(error: unknown): void {
    this.port.increment(PlatformMetric.Errors, ErrorMetricAttributes.of(error));
  }
}
