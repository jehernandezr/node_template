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
  /** Turns off the SDK: registers no providers or instrumentations. */
  readonly disabled?: boolean;
  /**
   * OTLP HTTP base of the Collector. Without a value, the exporters read
   * `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS` from the environment
   * (`http://localhost:4318` by default).
   */
  readonly otlpEndpoint?: string;
  /** Metrics export interval. 60 s by default. */
  readonly metricExportIntervalMs?: number;
  /** What to do with the incoming `traceparent`. By default it is treated as external. */
  readonly incomingTraceparent?: ExternalTraceparentPropagatorOptions;
  /** Automatic instrumentations. All by default. */
  readonly instrumentations?: readonly TelemetryInstrumentation[];
  /** UUIDv7 generator for trace ids. */
  readonly ids?: IdGenerator;
  /** Alternative exporters (tests or debugging). */
  readonly spanExporter?: SpanExporter;
  readonly logExporter?: LogRecordExporter;
  readonly metricReader?: IMetricReader;
  /** Exports each span and log as soon as it ends, without batching. Tests only. */
  readonly exportImmediately?: boolean;
}
