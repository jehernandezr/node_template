import type { MetricsPort } from '../metrics/metrics.port.js';

/** What the rest of the platform sees of the started telemetry. */
export abstract class TelemetryHandle {
  /** `false` with `OTEL_SDK_DISABLED` or `disabled: true`. */
  abstract readonly enabled: boolean;

  /** Metrics port: OTel if enabled, `NoopMetrics` otherwise. */
  abstract readonly metrics: MetricsPort;

  /** Exports pending spans, logs and metrics without shutting down the SDK (Lambda calls it at the end of each invocation). */
  abstract forceFlush(): Promise<void>;

  /** Exports what is pending and shuts down the SDK. */
  abstract shutdown(): Promise<void>;
}
