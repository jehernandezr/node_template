import type { MetricsPort } from '../metrics/metrics.port.js';

/** Lo que el resto de la plataforma ve de la telemetría arrancada. */
export abstract class TelemetryHandle {
  /** `false` con `OTEL_SDK_DISABLED` o `disabled: true`. */
  abstract readonly enabled: boolean;

  /** Puerto de métricas: OTel si está encendida, `NoopMetrics` si no. */
  abstract readonly metrics: MetricsPort;

  /** Exporta spans, logs y métricas pendientes sin apagar el SDK (Lambda lo llama al final de cada invocación). */
  abstract forceFlush(): Promise<void>;

  /** Exporta lo pendiente y apaga el SDK. */
  abstract shutdown(): Promise<void>;
}
