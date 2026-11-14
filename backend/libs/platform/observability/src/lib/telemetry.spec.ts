import {
  context,
  defaultTextMapGetter,
  propagation,
  ROOT_CONTEXT,
  SpanStatusCode,
} from '@opentelemetry/api';
import { InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { MetricReader } from '@opentelemetry/sdk-metrics';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace';
import { baseConfigSchema, defineConfig } from '@platform/config';
import { PlatformError } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/testing';
import { JsonLogger, LogLevel } from './logger.js';
import { PlatformMetric } from './metrics.js';
import { RequestContext } from './request-context.js';
import { platformTracer, SpanAttribute, withSpan } from './spans.js';
import {
  OtlpPath,
  otlpUrl,
  parseOtlpHeaders,
  setupTelemetry,
  telemetryOptionsFromConfig,
  type Telemetry,
} from './telemetry.js';
import { newTraceId } from './trace.js';

class TestReader extends MetricReader {
  protected onShutdown(): Promise<void> {
    return Promise.resolve();
  }

  protected onForceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

class PaymentDeclinedError extends PlatformError {
  readonly code = 'BILLING.PAYMENT.DECLINED';
}

const EXTERNAL_TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';

describe('setupTelemetry (PLAT-02, PLAT-04)', () => {
  const spans = new InMemorySpanExporter();
  const logRecords = new InMemoryLogRecordExporter();
  const reader = new TestReader();
  const lines: Record<string, unknown>[] = [];
  const logger = new JsonLogger({
    service: 'orders',
    level: LogLevel.Info,
    sink: (line) => lines.push(JSON.parse(line) as Record<string, unknown>),
  });
  let telemetry: Telemetry;

  async function finishedSpans() {
    await telemetry.forceFlush();
    return spans.getFinishedSpans();
  }

  beforeAll(() => {
    telemetry = setupTelemetry({
      serviceName: 'orders',
      serviceVersion: '1.2.3',
      environment: 'test',
      instrumentations: [],
      ids: new SequentialIdGenerator(),
      spanExporter: spans,
      logExporter: logRecords,
      metricReader: reader,
      exportImmediately: true,
    });
  });

  afterAll(async () => {
    await telemetry.shutdown();
  });

  beforeEach(() => {
    spans.reset();
    logRecords.reset();
    lines.length = 0;
  });

  it('is enabled and uses UUIDv7 trace ids from the IdGenerator', async () => {
    expect(telemetry.enabled).toBe(true);

    await withSpan('first', () => undefined);

    const [span] = await finishedSpans();
    const traceId = span?.spanContext().traceId;
    expect(traceId).toBe(newTraceId(new SequentialIdGenerator()));
    expect(traceId?.[12]).toBe('7');
  });

  it('a log written inside a span carries its trace_id and span_id', async () => {
    await withSpan('orders.create', () => {
      logger.info('creating order', { orderId: 'o-1', password: 'p' });
    });

    const [span] = await finishedSpans();
    const spanContext = span?.spanContext();
    expect(lines[0]).toMatchObject({
      message: 'creating order',
      trace_id: spanContext?.traceId,
      span_id: spanContext?.spanId,
      password: '[REDACTED]',
    });
    expect(lines[0]?.['trace_id']).toMatch(/^[0-9a-f]{32}$/);
    expect(lines[0]?.['span_id']).toMatch(/^[0-9a-f]{16}$/);

    const [record] = logRecords.getFinishedLogRecords();
    expect(record?.body).toBe('creating order');
    expect(record?.spanContext?.traceId).toBe(spanContext?.traceId);
    expect(record?.spanContext?.spanId).toBe(spanContext?.spanId);
    expect(record?.attributes['password']).toBe('[REDACTED]');
    expect(record?.resource.attributes['service.name']).toBe('orders');
  });

  it('RequestContext reports the active span ids over the stored ones', async () => {
    await withSpan('with-context', () => {
      RequestContext.run({ traceId: 'not-valid', tenantId: 't-1' }, () => {
        logger.info('in context');
      });
    });

    const [span] = await finishedSpans();
    expect(lines[0]).toMatchObject({
      trace_id: span?.spanContext().traceId,
      tenant_id: 't-1',
    });
    expect(lines[0]).not.toHaveProperty('trace_id_invalid');
  });

  it('marks the span as failed with the error code and rethrows', async () => {
    await expect(
      withSpan('billing.charge', () => {
        throw new PaymentDeclinedError('declined for https://u:p@psp/x');
      }),
    ).rejects.toBeInstanceOf(PaymentDeclinedError);

    const [span] = await finishedSpans();
    expect(span?.status).toEqual({
      code: SpanStatusCode.ERROR,
      message: 'BILLING.PAYMENT.DECLINED',
    });
    expect(span?.attributes[SpanAttribute.ErrorCode]).toBe(
      'BILLING.PAYMENT.DECLINED',
    );
    const exception = span?.events.find((event) => event.name === 'exception');
    expect(JSON.stringify(exception?.attributes)).not.toContain('u:p@');
  });

  it('opens a new trace for an external traceparent and keeps it as an attribute', async () => {
    const extracted = propagation.extract(
      ROOT_CONTEXT,
      { traceparent: `00-${EXTERNAL_TRACE}-00f067aa0ba902b7-01` },
      defaultTextMapGetter,
    );

    await context.with(extracted, () =>
      withSpan('http.request', () => withSpan('child', () => undefined)),
    );

    const finished = await finishedSpans();
    const root = finished.find((span) => span.name === 'http.request');
    const child = finished.find((span) => span.name === 'child');
    expect(root?.spanContext().traceId).not.toBe(EXTERNAL_TRACE);
    expect(root?.attributes[SpanAttribute.ExternalTraceId]).toBe(
      EXTERNAL_TRACE,
    );
    expect(child?.attributes[SpanAttribute.ExternalTraceId]).toBeUndefined();
    expect(child?.spanContext().traceId).toBe(root?.spanContext().traceId);
  });

  it('samples every trace in the SDK (the Collector decides)', () => {
    const span = platformTracer().startSpan('sampled');
    expect(span.isRecording()).toBe(true);
    span.end();
  });

  it('exposes a metrics port backed by OpenTelemetry', async () => {
    telemetry.metrics.increment(PlatformMetric.CacheErrors, {
      'error.code': 'PLATFORM.CACHE.TIMEOUT',
    });

    const result = await reader.collect();
    const names = result.resourceMetrics.scopeMetrics
      .flatMap((scope) => scope.metrics)
      .map((metric) => metric.descriptor.name);
    expect(names).toContain(PlatformMetric.CacheErrors);
  });
});

describe('setupTelemetry disabled', () => {
  it('returns a no-op telemetry', async () => {
    const telemetry = setupTelemetry({ serviceName: 'x', disabled: true });

    expect(telemetry.enabled).toBe(false);
    expect(() => telemetry.metrics.increment('m')).not.toThrow();
    await expect(telemetry.forceFlush()).resolves.toBeUndefined();
    await expect(telemetry.shutdown()).resolves.toBeUndefined();
  });
});

describe('telemetryOptionsFromConfig', () => {
  it('maps the base configuration', () => {
    const config = defineConfig(baseConfigSchema).load({
      SERVICE_NAME: 'orders',
      SERVICE_VERSION: '2.0.0',
      NODE_ENV: 'production',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector:4318',
      OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Basic%20abc,x-org=default',
      OTEL_METRIC_EXPORT_INTERVAL: '10000',
    });

    expect(
      telemetryOptionsFromConfig(config, { instrumentations: [] }),
    ).toEqual({
      serviceName: 'orders',
      serviceVersion: '2.0.0',
      environment: 'production',
      disabled: false,
      otlpEndpoint: 'http://collector:4318',
      otlpHeaders: { authorization: 'Basic abc', 'x-org': 'default' },
      metricExportIntervalMs: 10_000,
      instrumentations: [],
    });
  });

  it('parses OTLP headers and skips malformed pairs', () => {
    expect(parseOtlpHeaders('a=1, b = 2 ,broken,=x,c=%E0%A4%A')).toEqual({
      a: '1',
      b: '2',
      c: '%E0%A4%A',
    });
    expect(parseOtlpHeaders(undefined)).toEqual({});
  });
});

describe('otlpUrl', () => {
  it('joins the endpoint and the signal path without duplicate slashes', () => {
    expect(otlpUrl('http://localhost:4318', OtlpPath.Traces)).toBe(
      'http://localhost:4318/v1/traces',
    );
    expect(otlpUrl('http://localhost:4318///', OtlpPath.Logs)).toBe(
      'http://localhost:4318/v1/logs',
    );
  });

  it('stays linear with many trailing slashes', () => {
    const endpoint = `http://collector${'/'.repeat(100_000)}`;
    const started = performance.now();
    expect(otlpUrl(endpoint, OtlpPath.Metrics)).toBe(
      'http://collector/v1/metrics',
    );
    expect(performance.now() - started).toBeLessThan(250);
  });
});
