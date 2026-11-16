import { ConfigSection, envBoolean, envNumber } from '@platform/config';
import { z } from 'zod';

/**
 * Las variables `OTEL_EXPORTER_OTLP_*` (endpoint, encabezados, protocolo) no
 * están aquí: los exportadores OTLP las leen del ambiente con las reglas del
 * estándar, y una segunda lectura podría interpretarlas distinto.
 */
export const telemetryConfigSchema = z.object({
  /** Apaga el SDK de OpenTelemetry: no se exportan trazas, métricas ni logs OTLP. */
  OTEL_SDK_DISABLED: envBoolean().default(false),
  /** Intervalo de exportación de métricas, en milisegundos. */
  OTEL_METRIC_EXPORT_INTERVAL: envNumber({ min: 1000 }).default(60_000),
});

export type TelemetrySettings = z.infer<typeof telemetryConfigSchema>;

export const TelemetryConfig = new ConfigSection<TelemetrySettings>(
  'telemetry',
  telemetryConfigSchema,
);
