import type { LogRecordExporter } from '@opentelemetry/sdk-logs';
import type { IMetricReader } from '@opentelemetry/sdk-metrics';
import type { SpanExporter } from '@opentelemetry/sdk-trace';
import type { IdGenerator } from '@platform/kernel';
import type { ExternalTraceparentPropagatorOptions } from '../propagation/external-traceparent-propagator-options.js';
import type { TelemetryInstrumentation } from './telemetry-instrumentation.enum.js';

export interface TelemetryOptions {
  readonly serviceName: string;
  readonly serviceVersion?: string;
  /** Ambiente desplegado (`local`, `dev`, `staging`, `prod`). */
  readonly environment?: string;
  /** Apaga el SDK: no registra proveedores ni instrumentaciones. */
  readonly disabled?: boolean;
  /**
   * Base OTLP HTTP del Collector. Sin valor, los exportadores leen
   * `OTEL_EXPORTER_OTLP_ENDPOINT` y `OTEL_EXPORTER_OTLP_HEADERS` del ambiente
   * (por defecto `http://localhost:4318`).
   */
  readonly otlpEndpoint?: string;
  /** Intervalo de exportación de métricas. Por defecto 60 s. */
  readonly metricExportIntervalMs?: number;
  /** Qué hacer con el `traceparent` entrante. Por defecto se trata como externo. */
  readonly incomingTraceparent?: ExternalTraceparentPropagatorOptions;
  /** Instrumentaciones automáticas. Por defecto todas. */
  readonly instrumentations?: readonly TelemetryInstrumentation[];
  /** Generador de UUIDv7 para los trace ids. */
  readonly ids?: IdGenerator;
  /** Exportadores alternativos (pruebas o depuración). */
  readonly spanExporter?: SpanExporter;
  readonly logExporter?: LogRecordExporter;
  readonly metricReader?: IMetricReader;
  /** Exporta cada span y log en cuanto termina, sin lotes. Solo para pruebas. */
  readonly exportImmediately?: boolean;
}
