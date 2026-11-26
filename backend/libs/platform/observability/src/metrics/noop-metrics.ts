import { MetricsPort } from './metrics.port.js';

/** Discards everything. It is the port when telemetry is off. */
export class NoopMetrics extends MetricsPort {
  /**
   * No effect: telemetry is off.
   */
  override increment(): void {}

  /**
   * No effect: telemetry is off.
   */
  override record(): void {}
}
