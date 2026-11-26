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
import {
  SystemRandomSource,
  UuidV7IdGenerator,
  SystemClock,
} from '@platform/kernel';
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
 * Starts OpenTelemetry (ADR 0004): traces, metrics and logs over OTLP HTTP
 * to the Collector, which forwards them to OpenObserve. It starts early, outside
 * Nest, before importing the instrumented modules; `ObservabilityModule`
 * only shuts it down when the application closes.
 *
 * - UUIDv7 trace ids (`UuidV7TraceIdGenerator`).
 * - `ParentBased(AlwaysOn)` sampling: the Collector decides with tail sampling.
 * - Incoming `traceparent`: `ExternalTraceparentPropagator`.
 * - Automatic instrumentation of HTTP, `fetch`, `pg`, Valkey, AWS SDK and NestJS.
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

  /**
   * Reads the environment (`ServiceConfig` and `TelemetryConfig`) and starts. `overrides` wins over what was read.
   * @param env Environment variables.
   * @param overrides Options a test replaces.
   * @returns The started telemetry.
   */
  static start(
    env: Readonly<Record<string, string | undefined>>,
    overrides: Partial<TelemetryOptions> = {},
  ): TelemetryBootstrap {
    return TelemetryBootstrap.startWith({
      ...new TelemetryOptionsReader().read(env),
      ...overrides,
    });
  }

  /**
   * Starts with already built options.
   * @param options Telemetry options.
   * @returns The started telemetry.
   */
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
      options.ids ??
        new UuidV7IdGenerator(new SystemClock(), new SystemRandomSource()),
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
   * Exports pending spans, logs and metrics without shutting down the SDK. In Lambda it is
   * called at the end of each invocation, before the environment freezes.
   */
  override forceFlush(): Promise<void> {
    return this.flush();
  }

  /** Exports what is pending and shuts down the SDK. */
  override shutdown(): Promise<void> {
    return this.stop();
  }
}
