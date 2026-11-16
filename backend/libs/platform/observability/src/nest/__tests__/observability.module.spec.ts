import { Test } from '@nestjs/testing';
import { AppConfig, ConfigErrorCode, ServiceConfig } from '@platform/config';
import { ConfigModule } from '@platform/config/nest';
import { ErrorMetrics } from '../../metrics/error-metrics.js';
import { MetricsPort } from '../../metrics/metrics.port.js';
import { NoopMetrics } from '../../metrics/noop-metrics.js';
import { HealthRegistry } from '../../health/health-registry.js';
import { LoggingConfig } from '../../config/logging.config.js';
import { TelemetryConfig } from '../../config/telemetry.config.js';
import { LoggerPort } from '../../logging/logger.port.js';
import { LogSink } from '../../logging/log-sink.js';
import { OtlpLogSink } from '../../logging/otlp-log-sink.js';
import { StdoutLogSink } from '../../logging/stdout-log-sink.js';
import { StructuredLogger } from '../../logging/structured-logger.js';
import { LogLevel } from '../../logging/log-level.enum.js';
import { Redactor } from '../../redaction/redactor.js';
import { RequestContextStore } from '../../context/request-context-store.js';
import { TraceContextCodec } from '../../propagation/trace-context-codec.js';
import { TraceContextRestorer } from '../../propagation/trace-context-restorer.js';
import { DebugSampler } from '../../logging/debug-sampler.js';
import { Tracing } from '../../tracing/tracing.js';
import { MemoryLogSink } from '../../__tests__/utils/memory-log-sink.js';
import { ObservabilityModule } from '../observability.module.js';
import { TELEMETRY } from '../observability.tokens.js';
import { FakeTelemetryHandle } from './utils/fake-telemetry-handle.js';
import type { TestingModule } from '@nestjs/testing';

const SERVICE_ENV = { SERVICE_NAME: 'svc-test' };

describe('ObservabilityModule', () => {
  let moduleRef: TestingModule | undefined;

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = undefined;
  });

  it('provides the observability ports and their collaborators', async () => {
    const fake = new FakeTelemetryHandle(true);
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: SERVICE_ENV }),
        ObservabilityModule.forRoot({ telemetry: fake }),
      ],
    }).compile();

    expect(moduleRef.get(LoggerPort)).toBeInstanceOf(StructuredLogger);
    expect(moduleRef.get(MetricsPort)).toBe(fake.metrics);
    expect(moduleRef.get(ErrorMetrics)).toBeInstanceOf(ErrorMetrics);
    expect(moduleRef.get(HealthRegistry)).toBeInstanceOf(HealthRegistry);
    expect(moduleRef.get(Tracing)).toBeInstanceOf(Tracing);
    expect(moduleRef.get(Redactor)).toBeInstanceOf(Redactor);
    expect(moduleRef.get(RequestContextStore)).toBe(
      RequestContextStore.shared(),
    );
    expect(moduleRef.get(TraceContextCodec)).toBeInstanceOf(TraceContextCodec);
    expect(moduleRef.get(TraceContextRestorer)).toBeInstanceOf(
      TraceContextRestorer,
    );
    expect(moduleRef.get(DebugSampler)).toBeInstanceOf(DebugSampler);
    expect(moduleRef.get(TELEMETRY)).toBe(fake);
  });

  it('compiles for a service without database variables and exposes only its sections', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        // Un valor inválido de base de datos no rompe el arranque: nadie lo valida.
        ConfigModule.forRoot({
          env: { ...SERVICE_ENV, DB_SLOW_QUERY_MS: 'not-a-number' },
        }),
        ObservabilityModule.forRoot({
          telemetry: new FakeTelemetryHandle(true),
        }),
      ],
    }).compile();

    const appConfig = moduleRef.get(AppConfig);

    expect(Object.keys(appConfig.get(LoggingConfig)).sort()).toEqual([
      'LOG_DEBUG_CONTEXTS',
      'LOG_LEVEL',
      'LOG_SAMPLE_RATE',
    ]);
    expect(Object.keys(appConfig.get(TelemetryConfig)).sort()).toEqual([
      'OTEL_METRIC_EXPORT_INTERVAL',
      'OTEL_SDK_DISABLED',
    ]);
    expect(Object.keys(appConfig.get(ServiceConfig))).not.toContainEqual(
      expect.stringMatching(/^DB_/),
    );
  });

  it('rejects compilation when SERVICE_NAME is missing, naming the variable', async () => {
    const compiling = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: {} }),
        ObservabilityModule.forRoot({
          telemetry: new FakeTelemetryHandle(true),
        }),
      ],
    }).compile();

    await expect(compiling).rejects.toMatchObject({
      code: ConfigErrorCode.Invalid,
    });
    await expect(compiling).rejects.toThrow('SERVICE_NAME');
  });

  it('shuts the telemetry down when the module closes', async () => {
    const fake = new FakeTelemetryHandle(true);
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: SERVICE_ENV }),
        ObservabilityModule.forRoot({ telemetry: fake }),
      ],
    }).compile();

    await moduleRef.close();
    moduleRef = undefined;

    expect(fake.shutdownCalls).toBe(1);
  });

  it('keeps the request context across await and a timer', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: SERVICE_ENV }),
        ObservabilityModule.forRoot({
          telemetry: new FakeTelemetryHandle(true),
        }),
      ],
    }).compile();
    const store = moduleRef.get(RequestContextStore);

    const seen = await store.run({ tenantId: 'tenant-a' }, async () => {
      await Promise.resolve();
      const beforeTimer = store.current()?.tenantId;
      const inTimer = await new Promise<string | undefined>((resolve) => {
        setTimeout(() => resolve(store.current()?.tenantId), 0);
      });
      return [beforeTimer, store.current()?.tenantId, inTimer];
    });

    expect(seen).toEqual(['tenant-a', 'tenant-a', 'tenant-a']);
  });

  it('chooses the stdout sink when telemetry is disabled', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: SERVICE_ENV }),
        ObservabilityModule.forRoot({
          telemetry: new FakeTelemetryHandle(false),
        }),
      ],
    }).compile();

    expect(moduleRef.get(LogSink)).toBeInstanceOf(StdoutLogSink);
  });

  it('chooses the OTLP sink when telemetry is enabled', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: SERVICE_ENV }),
        ObservabilityModule.forRoot({
          telemetry: new FakeTelemetryHandle(true),
        }),
      ],
    }).compile();

    expect(moduleRef.get(LogSink)).toBeInstanceOf(OtlpLogSink);
  });

  it('writes redacted records through the sink that the module wires', async () => {
    const memorySink = new MemoryLogSink();
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: SERVICE_ENV }),
        ObservabilityModule.forRoot({
          telemetry: new FakeTelemetryHandle(true),
        }),
      ],
    })
      .overrideProvider(LogSink)
      .useValue(memorySink)
      .compile();

    moduleRef.get(LoggerPort).info('user signed in', { password: 'hunter2' });

    expect(memorySink.records).toHaveLength(1);
    expect(memorySink.records[0]).toMatchObject({
      level: LogLevel.Info,
      service: 'svc-test',
      fields: { password: Redactor.REDACTED },
    });
  });

  it('uses the no-op metrics when OTEL_SDK_DISABLED is set and no telemetry is passed', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          env: { ...SERVICE_ENV, OTEL_SDK_DISABLED: 'true' },
        }),
        ObservabilityModule.forRoot(),
      ],
    }).compile();

    expect(moduleRef.get(TELEMETRY)).toMatchObject({ enabled: false });
    expect(moduleRef.get(MetricsPort)).toBeInstanceOf(NoopMetrics);
  });
});
