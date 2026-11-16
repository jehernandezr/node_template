import { MetricsPort } from './metrics.port.js';

/** Descarta todo. Es el puerto cuando la telemetría está apagada. */
export class NoopMetrics extends MetricsPort {
  increment(): void {
    // Sin efecto: la telemetría está apagada.
  }

  record(): void {
    // Sin efecto: la telemetría está apagada.
  }
}
