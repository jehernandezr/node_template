import { AppConfig, ServiceConfig } from '@platform/config';
import { ConfigModule } from '@platform/config/nest';
import {
  Clock,
  IdGenerator,
  RandomSource,
  SystemClock,
  SystemRandomSource,
  UuidV7IdGenerator,
} from '@platform/kernel';
import { Global, Module, type DynamicModule } from '@nestjs/common';
import { RequestContextStore } from '../context/request-context-store.js';
import { LoggingConfig } from '../config/logging.config.js';
import { TelemetryConfig } from '../config/telemetry.config.js';
import { TelemetryOptionsReader } from '../config/telemetry-options.reader.js';
import { DebugSampler } from '../logging/debug-sampler.js';
import { LoggerPort } from '../logging/logger.port.js';
import { OtlpLogSink } from '../logging/otlp-log-sink.js';
import { LogSink } from '../logging/log-sink.js';
import { StdoutLogSink } from '../logging/stdout-log-sink.js';
import { StructuredLogger } from '../logging/structured-logger.js';
import { ErrorMetrics } from '../metrics/error-metrics.js';
import { MetricsPort } from '../metrics/metrics.port.js';
import { HealthRegistry } from '../health/health-registry.js';
import { Redactor } from '../redaction/redactor.js';
import { TraceContextCodec } from '../propagation/trace-context-codec.js';
import { TraceContextRestorer } from '../propagation/trace-context-restorer.js';
import { TelemetryBootstrap } from '../telemetry/telemetry-bootstrap.js';
import type { TelemetryHandle } from '../telemetry/telemetry-handle.js';
import { Tracing } from '../tracing/tracing.js';
import type { ObservabilityModuleOptions } from './observability-module-options.js';
import {
  ObservabilityModuleClass,
  OBSERVABILITY_OPTIONS,
} from './observability.module-definition.js';
import { TELEMETRY } from './observability.tokens.js';
import { RequestContextInterceptor } from './request-context.interceptor.js';
import { RequestContextMiddleware } from './request-context.middleware.js';
import { TelemetryShutdownHook } from './telemetry-shutdown.hook.js';

/**
 * Cableado de observability. Provee `LoggerPort`, `MetricsPort`, `ErrorMetrics`,
 * `RequestContextStore`, `Tracing`, `Redactor`, `HealthRegistry`,
 * `TraceContextCodec`, `TraceContextRestorer`, `DebugSampler`, `TELEMETRY`,
 * `RequestContextMiddleware` y `RequestContextInterceptor`, e importa las
 * secciones de configuración que usa. El reloj, la aleatoriedad y el generador
 * de ids son internos del módulo.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forFeature(ServiceConfig),
    ConfigModule.forFeature(LoggingConfig),
    ConfigModule.forFeature(TelemetryConfig),
  ],
  providers: [
    { provide: Clock, useFactory: () => new SystemClock() },
    { provide: RandomSource, useFactory: () => new SystemRandomSource() },
    {
      provide: IdGenerator,
      useFactory: (clock: Clock, random: RandomSource) =>
        new UuidV7IdGenerator(clock, random),
      inject: [Clock, RandomSource],
    },
    { provide: Redactor, useFactory: () => new Redactor() },
    {
      provide: Tracing,
      useFactory: (redactor: Redactor) => new Tracing(redactor),
      inject: [Redactor],
    },
    {
      // La misma instancia que lee el `RequestContext` estático: mientras haya
      // consumidores sin migrar, un contexto abierto por el middleware debe
      // verse desde ambos lados.
      provide: RequestContextStore,
      useFactory: () => RequestContextStore.shared(),
    },
    {
      provide: TraceContextCodec,
      useFactory: (ids: IdGenerator, random: RandomSource) =>
        new TraceContextCodec(ids, random),
      inject: [IdGenerator, RandomSource],
    },
    {
      provide: TraceContextRestorer,
      useFactory: (tracing: Tracing) => new TraceContextRestorer(tracing),
      inject: [Tracing],
    },
    {
      provide: DebugSampler,
      useFactory: (config: AppConfig, random: RandomSource) =>
        new DebugSampler(config.get(LoggingConfig).LOG_SAMPLE_RATE, random),
      inject: [AppConfig, RandomSource],
    },
    {
      provide: TELEMETRY,
      useFactory: (options: ObservabilityModuleOptions, config: AppConfig) =>
        options.telemetry ??
        TelemetryBootstrap.startWith(
          new TelemetryOptionsReader().fromSettings(
            config.get(ServiceConfig),
            config.get(TelemetryConfig),
          ),
        ),
      inject: [OBSERVABILITY_OPTIONS, AppConfig],
    },
    {
      provide: LogSink,
      useFactory: (telemetry: TelemetryHandle) =>
        telemetry.enabled ? new OtlpLogSink() : new StdoutLogSink(),
      inject: [TELEMETRY],
    },
    {
      provide: LoggerPort,
      useFactory: (
        config: AppConfig,
        sink: LogSink,
        redactor: Redactor,
        store: RequestContextStore,
        tracing: Tracing,
        clock: Clock,
      ) => {
        const logging = config.get(LoggingConfig);
        return new StructuredLogger({
          service: config.get(ServiceConfig).SERVICE_NAME,
          level: logging.LOG_LEVEL,
          debugContexts: logging.LOG_DEBUG_CONTEXTS,
          sink,
          redactor,
          contextStore: store,
          tracing,
          clock,
        });
      },
      inject: [
        AppConfig,
        LogSink,
        Redactor,
        RequestContextStore,
        Tracing,
        Clock,
      ],
    },
    {
      provide: MetricsPort,
      useFactory: (telemetry: TelemetryHandle) => telemetry.metrics,
      inject: [TELEMETRY],
    },
    {
      provide: ErrorMetrics,
      useFactory: (metrics: MetricsPort) => new ErrorMetrics(metrics),
      inject: [MetricsPort],
    },
    { provide: HealthRegistry, useFactory: () => new HealthRegistry() },
    RequestContextMiddleware,
    RequestContextInterceptor,
    TelemetryShutdownHook,
  ],
  exports: [
    LoggerPort,
    MetricsPort,
    ErrorMetrics,
    RequestContextStore,
    Tracing,
    Redactor,
    HealthRegistry,
    TraceContextCodec,
    TraceContextRestorer,
    DebugSampler,
    TELEMETRY,
    RequestContextMiddleware,
    RequestContextInterceptor,
  ],
})
export class ObservabilityModule extends ObservabilityModuleClass {
  static override forRoot(
    options: ObservabilityModuleOptions = {},
  ): DynamicModule {
    return super.forRoot(options);
  }
}
