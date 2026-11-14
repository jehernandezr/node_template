import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  SimpleLogRecordProcessor,
  type LogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  AlwaysOnSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
  SimpleSpanProcessor,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { SystemRandomSource, UuidV7IdGenerator } from '@platform/kernel';
import { TelemetryOptionsReader } from '../config/telemetry-options.reader.js';
import { NoopMetrics } from '../metrics/noop-metrics.js';
import { OtelMetrics } from '../metrics/otel-metrics.js';
import type { MetricsPort } from '../metrics/metrics.port.js';
import { ExternalTraceparentPropagator } from '../propagation/external-traceparent-propagator.js';
import { TraceContextCodec } from '../propagation/trace-context-codec.js';
import { ExternalTraceIdSpanProcessor } from './external-trace-id-span-processor.js';
import { InstrumentationFactory } from './instrumentation-factory.js';
import { OtlpPath } from './otlp-path.enum.js';
import { OtlpUrl } from './otlp-url.js';
import { TelemetryHandle } from './telemetry-handle.js';
import { TelemetryInstrumentation } from './telemetry-instrumentation.enum.js';
import type { TelemetryOptions } from './telemetry-options.js';
import { UuidV7TraceIdGenerator } from './uuid-v7-trace-id-generator.js';

/**
 * Arranca OpenTelemetry (ADR 0004): trazas, métricas y logs por OTLP HTTP
 * hacia el Collector, que los reenvía a OpenObserve. Se arranca temprano, fuera
 * de Nest, antes de importar los módulos instrumentados; `ObservabilityModule`
 * solo lo apaga al cerrar la aplicación.
 *
 * - Trace ids UUIDv7 (`UuidV7TraceIdGenerator`).
 * - Muestreo `ParentBased(AlwaysOn)`: el Collector decide con tail sampling.
 * - `traceparent` entrante: `ExternalTraceparentPropagator`.
 * - Instrumentación automática de HTTP, `fetch`, `pg`, Valkey, AWS SDK y NestJS.
 */
export class TelemetryBootstrap extends TelemetryHandle {
  static readonly ATTR_DEPLOYMENT_ENVIRONMENT_NAME =
    'deployment.environment.name';

  private constructor(
    readonly enabled: boolean,
    readonly metrics: MetricsPort,
    private readonly flush: () => Promise<void>,
    private readonly stop: () => Promise<void>,
  ) {
    super();
  }

  /** Lee el entorno (`ServiceConfig` y `TelemetryConfig`) y arranca. `overrides` gana sobre lo leído. */
  static start(
    env: Readonly<Record<string, string | undefined>>,
    overrides: Partial<TelemetryOptions> = {},
  ): TelemetryBootstrap {
    return TelemetryBootstrap.startWith({
      ...new TelemetryOptionsReader().read(env),
      ...overrides,
    });
  }

  /** Arranca con opciones ya armadas. */
  static startWith(options: TelemetryOptions): TelemetryBootstrap {
    if (options.disabled === true) {
      return new TelemetryBootstrap(
        false,
        new NoopMetrics(),
        () => Promise.resolve(),
        () => Promise.resolve(),
      );
    }
    const endpoint = options.otlpEndpoint;
    const exporterConfig = (path: OtlpPath) =>
      endpoint === undefined ? {} : { url: OtlpUrl.of(endpoint, path) };
    const immediate = options.exportImmediately === true;

    const spanExporter =
      options.spanExporter ??
      new OTLPTraceExporter(exporterConfig(OtlpPath.Traces));
    const logExporter =
      options.logExporter ?? new OTLPLogExporter(exporterConfig(OtlpPath.Logs));
    const metricReader =
      options.metricReader ??
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(exporterConfig(OtlpPath.Metrics)),
        exportIntervalMillis: options.metricExportIntervalMs ?? 60_000,
      });

    const spanProcessor: SpanProcessor = immediate
      ? new SimpleSpanProcessor({ exporter: spanExporter })
      : new BatchSpanProcessor({ exporter: spanExporter });
    const logProcessor: LogRecordProcessor = immediate
      ? new SimpleLogRecordProcessor({ exporter: logExporter })
      : new BatchLogRecordProcessor({ exporter: logExporter });

    const codec = new TraceContextCodec(
      options.ids ?? new UuidV7IdGenerator(),
      new SystemRandomSource(),
    );
    const factory = new InstrumentationFactory();
    const sdk = new NodeSDK({
      serviceName: options.serviceName,
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: options.serviceName,
        ...(options.serviceVersion !== undefined && {
          [ATTR_SERVICE_VERSION]: options.serviceVersion,
        }),
        ...(options.environment !== undefined && {
          [TelemetryBootstrap.ATTR_DEPLOYMENT_ENVIRONMENT_NAME]:
            options.environment,
        }),
      }),
      idGenerator: new UuidV7TraceIdGenerator(codec),
      sampler: new ParentBasedSampler({ root: new AlwaysOnSampler() }),
      textMapPropagator: new ExternalTraceparentPropagator(
        options.incomingTraceparent,
      ),
      spanProcessors: [new ExternalTraceIdSpanProcessor(), spanProcessor],
      metricReaders: [metricReader],
      logRecordProcessors: [logProcessor],
      instrumentations: (
        options.instrumentations ?? Object.values(TelemetryInstrumentation)
      ).map((kind) => factory.create(kind)),
    });
    sdk.start();

    return new TelemetryBootstrap(
      true,
      new OtelMetrics(),
      async () => {
        await Promise.all([
          spanProcessor.forceFlush(),
          logProcessor.forceFlush(),
          metricReader.forceFlush(),
        ]);
      },
      () => sdk.shutdown(),
    );
  }

  /**
   * Exporta spans, logs y métricas pendientes sin apagar el SDK. En Lambda se
   * llama al final de cada invocación, antes de que el entorno se congele.
   */
  forceFlush(): Promise<void> {
    return this.flush();
  }

  /** Exporta lo pendiente y apaga el SDK. */
  shutdown(): Promise<void> {
    return this.stop();
  }
}
