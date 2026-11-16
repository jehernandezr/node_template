import { PlatformMetric } from './platform-metric.enum.js';
import { ErrorMetricAttributes } from './error-metric-attributes.js';
import type { MetricsPort } from './metrics.port.js';

/** Cuenta un error por su código, para alertar por código y no solo por tasa. */
export class ErrorMetrics {
  constructor(private readonly port: MetricsPort) {}

  record(error: unknown): void {
    this.port.increment(PlatformMetric.Errors, ErrorMetricAttributes.of(error));
  }
}
