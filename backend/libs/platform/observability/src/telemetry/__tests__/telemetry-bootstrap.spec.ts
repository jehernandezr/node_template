import {
  context,
  propagation,
  ROOT_CONTEXT,
  SpanStatusCode,
  trace,
  defaultTextMapGetter,
} from '@opentelemetry/api';
import { InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { ConfigErrorCode } from '@platform/config';
import {
  FixedClock,
  FixedRandomSource,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import { MemoryLogSink } from '../../__tests__/utils/memory-log-sink.js';
import { LogField } from '../../logging/log-field.enum.js';
import { LogLevel } from '../../logging/log-level.enum.js';
import { OtlpLogSink } from '../../logging/otlp-log-sink.js';
import { StructuredLogger } from '../../logging/structured-logger.js';
import { NoopMetrics } from '../../metrics/noop-metrics.js';
import { PlatformMetric } from '../../metrics/platform-metric.enum.js';
import { RequestContextStore } from '../../context/request-context-store.js';
import { Redactor } from '../../redaction/redactor.js';
import { SpanAttribute } from '../../tracing/span-attribute.enum.js';
import { Tracing } from '../../tracing/tracing.js';
import { TraceContextCodec } from '../../propagation/trace-context-codec.js';
import { TelemetryBootstrap } from '../telemetry-bootstrap.js';
import { TestMetricReader } from '../../__tests__/utils/test-metric-reader.js';
import { PaymentDeclinedError } from './utils/payment-declined.error.js';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace';

const EXTERNAL_TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';

describe('TelemetryBootstrap', () => {
  const spans = new InMemorySpanExporter();
  const logRecords = new InMemoryLogRecordExporter();
  const reader = new TestMetricReader();
  const sink = new MemoryLogSink();
  const redactor = new Redactor();
  const tracing = new Tracing(redactor);
  const contextStore = new RequestContextStore(tracing);
  const logger = new StructuredLogger({
    service: 'orders',
    level: LogLevel.Info,
    debugContexts: [],
    sink,
    redactor,
    contextStore,
    tracing,
    clock: new FixedClock(),
  });
  const otlpLogger = new StructuredLogger({
    service: 'orders',
    level: LogLevel.Info,
    debugContexts: [],
    sink: new OtlpLogSink(),
    redactor,
    contextStore,
    tracing,
    clock: new FixedClock(),
  });
  let telemetry: TelemetryBootstrap;

  async function finishedSpans() {
    await telemetry.forceFlush();
    return spans.getFinishedSpans();
  }

  beforeAll(() => {
    telemetry = TelemetryBootstrap.startWith({
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
    sink.records.length = 0;
  });

  it('is enabled and uses UUIDv7 trace ids from the IdGenerator', async () => {
    expect(telemetry.enabled).toBe(true);

    await tracing.withSpan('first', () => undefined);

    const [span] = await finishedSpans();
    const traceId = span?.spanContext().traceId;
    expect(traceId).toBe(
      new TraceContextCodec(
        new SequentialIdGenerator(),
        new FixedRandomSource(),
      ).newTraceId(),
    );
    expect(traceId?.[12]).toBe('7');
  });

  it('a log written inside a span carries its trace_id and span_id', async () => {
    await tracing.withSpan('orders.create', () => {
      logger.info('creating order', { orderId: 'o-1', password: 'p' });
    });

    const [span] = await finishedSpans();
    const spanContext = span?.spanContext();
    const [record] = sink.records;
    expect(record).toMatchObject({
      message: 'creating order',
      fields: {
        [LogField.TraceId]: spanContext?.traceId,
        [LogField.SpanId]: spanContext?.spanId,
        password: Redactor.REDACTED,
      },
    });
    expect(record?.fields[LogField.TraceId]).toMatch(/^[0-9a-f]{32}$/);
    expect(record?.fields[LogField.SpanId]).toMatch(/^[0-9a-f]{16}$/);
    expect(logRecords.getFinishedLogRecords()).toHaveLength(0);
  });

  it('an OTLP log goes only to the exporter, with the span context', async () => {
    await tracing.withSpan('orders.create', () => {
      otlpLogger.info('creating order', { orderId: 'o-1', password: 'p' });
    });

    const [span] = await finishedSpans();
    const spanContext = span?.spanContext();
    expect(sink.records).toHaveLength(0);
    const [record] = logRecords.getFinishedLogRecords();
    expect(record?.body).toBe('creating order');
    expect(record?.spanContext?.traceId).toBe(spanContext?.traceId);
    expect(record?.spanContext?.spanId).toBe(spanContext?.spanId);
    expect(record?.attributes['password']).toBe(Redactor.REDACTED);
    expect(record?.resource.attributes['service.name']).toBe('orders');
  });

  it('the request context reports the active span ids over the stored ones', async () => {
    const store = new RequestContextStore(tracing);
    const contextLogger = new StructuredLogger({
      service: 'orders',
      level: LogLevel.Info,
      debugContexts: [],
      sink,
      redactor,
      contextStore: store,
      tracing,
      clock: new FixedClock(),
    });

    await tracing.withSpan('with-context', () => {
      store.run({ traceId: 'not-valid', tenantId: 't-1' }, () => {
        contextLogger.info('in context');
      });
    });

    const [span] = await finishedSpans();
    expect(sink.records[0]?.fields).toMatchObject({
      [LogField.TraceId]: span?.spanContext().traceId,
      [LogField.TenantId]: 't-1',
    });
    expect(sink.records[0]?.fields).not.toHaveProperty(LogField.TraceIdInvalid);
  });

  it('marks the span as failed with the error code and rethrows', async () => {
    await expect(
      tracing.withSpan('billing.charge', () => {
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
      tracing.withSpan('http.request', () =>
        tracing.withSpan('child', () => undefined),
      ),
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
    const span = trace.getTracer(Tracing.SCOPE).startSpan('sampled');

    expect(span.isRecording()).toBe(true);
    span.end();
  });

  it('exposes a metrics port backed by OpenTelemetry', async () => {
    telemetry.metrics.increment(PlatformMetric.Errors, {
      'error.code': 'PLATFORM.CACHE.TIMEOUT',
    });

    const result = await reader.collect();
    const names = result.resourceMetrics.scopeMetrics
      .flatMap((scope) => scope.metrics)
      .map((metric) => metric.descriptor.name);
    expect(names).toContain(PlatformMetric.Errors);
  });

  describe('when disabled', () => {
    it('returns a no-op telemetry', async () => {
      const disabled = TelemetryBootstrap.startWith({
        serviceName: 'x',
        disabled: true,
      });

      expect(disabled.enabled).toBe(false);
      expect(disabled.metrics).toBeInstanceOf(NoopMetrics);
      expect(() => disabled.metrics.increment('m')).not.toThrow();
      await expect(disabled.forceFlush()).resolves.toBeUndefined();
      await expect(disabled.shutdown()).resolves.toBeUndefined();
    });
  });

  describe('start', () => {
    it('stays disabled with OTEL_SDK_DISABLED and reports the no-op metrics', () => {
      const started = TelemetryBootstrap.start({
        SERVICE_NAME: 'orders',
        OTEL_SDK_DISABLED: 'true',
      });

      expect(started.enabled).toBe(false);
      expect(started.metrics).toBeInstanceOf(NoopMetrics);
    });

    it('rejects an environment without SERVICE_NAME', () => {
      expect(() => TelemetryBootstrap.start({})).toThrow(
        expect.objectContaining({ code: ConfigErrorCode.Invalid }),
      );
    });

    it('lets the overrides win over the environment', () => {
      const started = TelemetryBootstrap.start(
        { SERVICE_NAME: 'orders' },
        { disabled: true },
      );

      expect(started.enabled).toBe(false);
    });
  });
});
