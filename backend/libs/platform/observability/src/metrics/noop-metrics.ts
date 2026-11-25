import { MetricsPort } from './metrics.port.js';

/** Discards everything. It is the port when telemetry is off. */
export class NoopMetrics extends MetricsPort {
  increment(): void {
    // No effect: telemetry is off.
  }

  record(): void {
    // No effect: telemetry is off.
  }
}
