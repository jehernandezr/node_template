import { trace, type Context } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  InstrumentationNodeModuleDefinition,
  type Instrumentation,
} from '@opentelemetry/instrumentation';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  SimpleLogRecordProcessor,
  type LogRecordExporter,
  type LogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import {
  PeriodicExportingMetricReader,
  type IMetricReader,
} from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  AlwaysOnSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
  SimpleSpanProcessor,
  type IdGenerator as OtelIdGenerator,
  type Span,
  type SpanExporter,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import type { BaseConfig } from '@platform/config';
import { UuidV7IdGenerator, type IdGenerator } from '@platform/kernel';
import { NoopMetrics, OtelMetrics, type MetricsPort } from './metrics.js';
import {
  ExternalTraceparentPropagator,
  externalTraceIdFrom,
  type ExternalTraceparentPropagatorOptions,
} from './propagation.js';
import { SpanAttribute } from './spans.js';
import { newSpanId, newTraceId } from './trace.js';

/** Atributo de recurso del ambiente (semconv `deployment.environment.name`). */
export const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name';

/** Instrumentaciones automáticas disponibles. */
export enum TelemetryInstrumentation {
  Http = 'http',
  /** `fetch` nativo de Node (undici). */
  Fetch = 'fetch',
  Pg = 'pg',
  /** Cliente de Valkey (`iovalkey`). */
  Valkey = 'valkey',
  AwsSdk = 'aws-sdk',
  NestJs = 'nestjs',
}

/** Rutas OTLP HTTP de cada señal, relativas al endpoint base. */
export enum OtlpPath {
  Traces = 'v1/traces',
  Metrics = 'v1/metrics',
  Logs = 'v1/logs',
}

/**
 * Generador de ids de OpenTelemetry que usa UUIDv7 para el trace id (ADR 0003).
 * El UUIDv7 sin guiones es el trace id W3C, así la traza que abre la
 * plataforma tiene el mismo `traceId` que devuelve `x-trace-id`.
 */
export class UuidV7TraceIdGenerator implements OtelIdGenerator {
  constructor(private readonly ids: IdGenerator = new UuidV7IdGenerator()) {}

  generateTraceId(): string {
    return newTraceId(this.ids);
  }

  generateSpanId(): string {
    return newSpanId();
  }
}

/**
 * Agrega `platform.external_trace_id` al span raíz cuando la petición traía
 * un `traceparent` externo que no se continuó.
 */
export class ExternalTraceIdSpanProcessor implements SpanProcessor {
  onStart(span: Span, parentContext: Context): void {
    if (trace.getSpanContext(parentContext) !== undefined) {
      return;
    }
    const external = externalTraceIdFrom(parentContext);
    if (external !== undefined) {
      span.setAttribute(SpanAttribute.ExternalTraceId, external);
    }
  }

  onEnd(): void {
    // sin efecto
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

/** Versiones de `iovalkey` que comparten la estructura interna de `ioredis`. */
export const IOVALKEY_SUPPORTED_VERSIONS = ['>=0.1.0 <1'];

/**
 * Instrumentación de `ioredis` aplicada al paquete `iovalkey`. `iovalkey` es
 * un fork con otro nombre de paquete: la instrumentación oficial solo engancha
 * el módulo `ioredis`, así que sin esta definición ningún comando de Valkey
 * generaría spans. El fork conserva `sendCommand` y `connect` en el
 * prototipo del cliente, que es lo que la instrumentación envuelve.
 */
export class IovalkeyInstrumentation extends IORedisInstrumentation {
  override init(): InstrumentationNodeModuleDefinition[] {
    return super
      .init()
      .map(
        (definition) =>
          new InstrumentationNodeModuleDefinition(
            'iovalkey',
            IOVALKEY_SUPPORTED_VERSIONS,
            definition.patch,
            definition.unpatch,
          ),
      );
  }
}

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

export interface Telemetry {
  readonly enabled: boolean;
  /** Puerto de métricas para resilience, cache y los servicios. */
  readonly metrics: MetricsPort;
  /**
   * Exporta spans, logs y métricas pendientes sin apagar el SDK. En Lambda se
   * llama al final de cada invocación, antes de que el entorno se congele.
   */
  forceFlush(): Promise<void>;
  /** Exporta lo pendiente y apaga el SDK. Llamar al cerrar el proceso. */
  shutdown(): Promise<void>;
}

const ALL_INSTRUMENTATIONS = Object.values(TelemetryInstrumentation);

function createInstrumentation(
  kind: TelemetryInstrumentation,
): Instrumentation {
  switch (kind) {
    case TelemetryInstrumentation.Http:
      return new HttpInstrumentation();
    case TelemetryInstrumentation.Fetch:
      return new UndiciInstrumentation();
    case TelemetryInstrumentation.Pg:
      // Sin valores de los parámetros en los spans.
      return new PgInstrumentation({ enhancedDatabaseReporting: false });
    case TelemetryInstrumentation.Valkey:
      // Solo el nombre del comando: las llaves y valores pueden llevar datos.
      return new IovalkeyInstrumentation({
        dbStatementSerializer: (command) => command,
      });
    case TelemetryInstrumentation.AwsSdk:
      return new AwsInstrumentation({ suppressInternalInstrumentation: true });
    case TelemetryInstrumentation.NestJs:
      return new NestInstrumentation();
  }
}

const SLASH = 0x2f;

/** URL del exportador OTLP: el endpoint sin barras finales más la ruta de la señal. */
export function otlpUrl(endpoint: string, path: OtlpPath): string {
  // Quita las barras finales con un recorrido lineal; una regex /\/+$/ es
  // polinomial con muchas barras seguidas (CodeQL js/polynomial-redos).
  let end = endpoint.length;
  while (end > 0 && endpoint.charCodeAt(end - 1) === SLASH) end -= 1;
  return `${endpoint.slice(0, end)}/${path}`;
}

/**
 * Arranca OpenTelemetry (ADR 0004): trazas, métricas y logs por OTLP HTTP
 * hacia el Collector, que los reenvía a OpenObserve.
 *
 * - Trace ids UUIDv7 ({@link UuidV7TraceIdGenerator}).
 * - Muestreo: el SDK envía todas las trazas (`ParentBased(AlwaysOn)`) y el
 *   Collector decide: todas las trazas con error y un porcentaje del resto
 *   (tail sampling). Así una traza con error nunca se pierde por una decisión
 *   tomada antes de saber que falló.
 * - `traceparent` entrante: {@link ExternalTraceparentPropagator}.
 * - Instrumentación automática de HTTP, `fetch`, `pg`, Valkey (`iovalkey`),
 *   SDK de AWS y NestJS.
 * - Endpoint y encabezados OTLP: los del ambiente (`OTEL_EXPORTER_OTLP_*`),
 *   salvo que se pase `otlpEndpoint`.
 *
 * Se llama una vez, antes de importar los módulos instrumentados. Con ESM el
 * proceso arranca con el hook de carga de OpenTelemetry, por ejemplo
 * `node --import ./telemetry.js --experimental-loader=@opentelemetry/instrumentation/hook.mjs main.js`.
 * En Lambda, la capa ADOT hace de Collector.
 */
export function setupTelemetry(options: TelemetryOptions): Telemetry {
  if (options.disabled === true) {
    return {
      enabled: false,
      metrics: new NoopMetrics(),
      forceFlush: () => Promise.resolve(),
      shutdown: () => Promise.resolve(),
    };
  }
  const endpoint = options.otlpEndpoint;
  const exporterConfig = (path: OtlpPath) =>
    endpoint === undefined ? {} : { url: otlpUrl(endpoint, path) };
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

  const sdk = new NodeSDK({
    serviceName: options.serviceName,
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: options.serviceName,
      ...(options.serviceVersion !== undefined && {
        [ATTR_SERVICE_VERSION]: options.serviceVersion,
      }),
      ...(options.environment !== undefined && {
        [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: options.environment,
      }),
    }),
    idGenerator: new UuidV7TraceIdGenerator(options.ids),
    sampler: new ParentBasedSampler({ root: new AlwaysOnSampler() }),
    textMapPropagator: new ExternalTraceparentPropagator(
      options.incomingTraceparent,
    ),
    spanProcessors: [new ExternalTraceIdSpanProcessor(), spanProcessor],
    metricReaders: [metricReader],
    logRecordProcessors: [logProcessor],
    instrumentations: (options.instrumentations ?? ALL_INSTRUMENTATIONS).map(
      createInstrumentation,
    ),
  });
  sdk.start();

  return {
    enabled: true,
    metrics: new OtelMetrics(),
    forceFlush: async () => {
      await Promise.all([
        spanProcessor.forceFlush(),
        logProcessor.forceFlush(),
        metricReader.forceFlush(),
      ]);
    },
    shutdown: () => sdk.shutdown(),
  };
}

/** Opciones de {@link setupTelemetry} a partir de la configuración base del servicio. */
export function telemetryOptionsFromConfig(
  config: Pick<
    BaseConfig,
    | 'SERVICE_NAME'
    | 'SERVICE_VERSION'
    | 'DEPLOY_ENVIRONMENT'
    | 'OTEL_SDK_DISABLED'
    | 'OTEL_METRIC_EXPORT_INTERVAL'
  >,
  overrides: Partial<TelemetryOptions> = {},
): TelemetryOptions {
  return {
    serviceName: config.SERVICE_NAME,
    ...(config.SERVICE_VERSION !== undefined && {
      serviceVersion: config.SERVICE_VERSION,
    }),
    environment: config.DEPLOY_ENVIRONMENT,
    disabled: config.OTEL_SDK_DISABLED,
    metricExportIntervalMs: config.OTEL_METRIC_EXPORT_INTERVAL,
    ...overrides,
  };
}
