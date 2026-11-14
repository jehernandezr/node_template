import { context, trace, TraceFlags } from '@opentelemetry/api';
import { StackContextManager } from '@opentelemetry/sdk-trace';
import { FixedClock } from '@platform/kernel/test-utils';
import { ActorType } from '../../context/actor-type.enum.js';
import { RequestContextStore } from '../../context/request-context-store.js';
import { Redactor } from '../../redaction/redactor.js';
import { Tracing } from '../../tracing/tracing.js';
import { LogLevel } from '../log-level.enum.js';
import { StructuredLogger } from '../structured-logger.js';
import { MemoryLogSink } from '../../__tests__/utils/memory-log-sink.js';
import type { StructuredLoggerOptions } from '../structured-logger.options.js';

const FIXED_DATE = new Date('2026-01-02T03:04:05.000Z');
const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const SPAN_ID = 'b7ad6b7169203331';
const R = '[REDACTED]';

interface SetupOptions {
  readonly level?: LogLevel;
  readonly debugContexts?: readonly string[];
  readonly context?: string;
}

function setup(options: SetupOptions = {}): {
  logger: StructuredLogger;
  sink: MemoryLogSink;
  store: RequestContextStore;
} {
  const sink = new MemoryLogSink();
  const tracing = new Tracing(new Redactor());
  const store = new RequestContextStore(tracing);
  const loggerOptions: StructuredLoggerOptions = {
    service: 'svc',
    level: options.level ?? LogLevel.Info,
    debugContexts: options.debugContexts ?? [],
    sink,
    redactor: new Redactor(),
    contextStore: store,
    tracing,
    clock: new FixedClock(FIXED_DATE),
    ...(options.context !== undefined && { context: options.context }),
  };
  return { logger: new StructuredLogger(loggerOptions), sink, store };
}

describe('StructuredLogger', () => {
  it('writes a record with the message, level, service and timestamp', () => {
    const { logger, sink } = setup({ context: 'auth' });

    logger.info('user logged in', { count: 2 });

    expect(sink.records).toEqual([
      {
        level: LogLevel.Info,
        message: 'user logged in',
        timestamp: FIXED_DATE,
        service: 'svc',
        context: 'auth',
        fields: { count: 2 },
      },
    ]);
  });

  describe('level filtering', () => {
    it('drops records below the threshold and keeps the rest', () => {
      const { logger, sink } = setup({ level: LogLevel.Warn });

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(sink.records.map((record) => record.level)).toEqual([
        LogLevel.Warn,
        LogLevel.Error,
      ]);
    });

    it('does not emit debug by default at info level', () => {
      const { logger, sink } = setup({ level: LogLevel.Info });

      logger.debug('d');

      expect(sink.records).toHaveLength(0);
    });

    it('emits debug when the level is debug', () => {
      const { logger, sink } = setup({ level: LogLevel.Debug });

      logger.debug('d');

      expect(sink.records).toHaveLength(1);
    });
  });

  describe('debug emission', () => {
    it('emits debug when the context is in debugContexts', () => {
      const { logger, sink } = setup({
        level: LogLevel.Info,
        debugContexts: ['auth', 'reports'],
        context: 'auth',
      });

      logger.debug('auth detail');

      expect(sink.records).toHaveLength(1);
      expect(sink.records[0]).toMatchObject({
        level: LogLevel.Debug,
        context: 'auth',
      });
    });

    it('does not emit debug for a context outside debugContexts', () => {
      const { logger, sink } = setup({
        level: LogLevel.Info,
        debugContexts: ['auth'],
        context: 'billing',
      });

      logger.debug('billing detail');

      expect(sink.records).toHaveLength(0);
    });

    it('emits debug when the current request is debugSampled', () => {
      const { logger, sink, store } = setup({ level: LogLevel.Info });

      store.run({ debugSampled: true }, () => {
        logger.debug('sampled detail');
      });

      expect(sink.records).toHaveLength(1);
    });

    it('does not emit debug when the request is not sampled', () => {
      const { logger, sink, store } = setup({ level: LogLevel.Info });

      store.run({ debugSampled: false }, () => {
        logger.debug('not sampled');
      });

      expect(sink.records).toHaveLength(0);
    });
  });

  describe('request context fields', () => {
    it('adds the trace fields and the request fields from the store', () => {
      const { logger, sink, store } = setup();

      store.run(
        {
          traceId: TRACE_ID,
          spanId: SPAN_ID,
          tenantId: 't-1',
          userId: 'u-1',
          actorId: 'u-1',
          actorType: ActorType.User,
          region: 'co',
          externalTraceId: '4bf92f3577b34da6a3ce929d0e0e4736',
          debugSampled: false,
        },
        () => logger.info('in request'),
      );

      expect(sink.records[0]?.fields).toEqual({
        trace_id: TRACE_ID,
        span_id: SPAN_ID,
        external_trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
        tenant_id: 't-1',
        user_id: 'u-1',
        actor_id: 'u-1',
        actor_type: 'user',
        region: 'co',
      });
    });

    it('takes the trace fields from the active span when no request context is open', () => {
      const { logger, sink } = setup();
      const span = trace.wrapSpanContext({
        traceId: TRACE_ID,
        spanId: SPAN_ID,
        traceFlags: TraceFlags.SAMPLED,
      });
      context.setGlobalContextManager(new StackContextManager().enable());

      try {
        context.with(trace.setSpan(context.active(), span), () =>
          logger.info('in span'),
        );
      } finally {
        context.disable();
      }

      expect(sink.records[0]?.fields).toEqual({
        trace_id: TRACE_ID,
        span_id: SPAN_ID,
      });
    });

    it('omits trace fields outside a request', () => {
      const { logger, sink } = setup();

      logger.info('no request');

      expect(sink.records[0]?.fields).toEqual({});
    });

    it('logs a hyphenated UUIDv7 traceId as 32 hex', () => {
      const { logger, sink, store } = setup();

      store.run({ traceId: '0af76519-16cd-43dd-8448-eb211c80319c' }, () =>
        logger.info('hyphenated'),
      );

      expect(sink.records[0]?.fields).toMatchObject({ trace_id: TRACE_ID });
    });

    it('never writes the raw value of a malformed traceId', () => {
      const { logger, sink, store } = setup();
      const raw = 'not-a-trace<script>';

      store.run({ traceId: raw, spanId: 'zz' }, () => logger.info('malformed'));

      expect(sink.records[0]?.fields).toEqual({ trace_id_invalid: true });
      expect(JSON.stringify(sink.records[0])).not.toContain('script');
    });

    it('does not let caller fields overwrite the reserved fields', () => {
      const { logger, sink, store } = setup();

      store.run({ traceId: TRACE_ID, debugSampled: false }, () =>
        logger.info('spoof', { trace_id: 'x', level: 'error', tenant_id: 'y' }),
      );

      expect(sink.records[0]).toMatchObject({ level: LogLevel.Info });
      expect(sink.records[0]?.fields).toMatchObject({ trace_id: TRACE_ID });
      expect(sink.records[0]?.fields).not.toHaveProperty('tenant_id');
    });

    it('keeps the context across awaits inside the request', async () => {
      const { logger, sink, store } = setup();

      await store.run({ traceId: TRACE_ID, debugSampled: false }, async () => {
        await Promise.resolve();
        logger.info('after await');
      });

      expect(sink.records[0]?.fields).toMatchObject({ trace_id: TRACE_ID });
    });
  });

  describe('child bindings', () => {
    it('adds bindings to every record of the child', () => {
      const { logger, sink } = setup();

      logger
        .child({ module: 'orders', orderId: 'o-1' })
        .info('created', { total: 10 });

      expect(sink.records[0]?.fields).toEqual({
        module: 'orders',
        orderId: 'o-1',
        total: 10,
      });
      expect(sink.records[0]?.message).toBe('created');
    });

    it('does not add child bindings to the parent logger', () => {
      const { logger, sink } = setup();

      logger.child({ module: 'orders' });
      logger.info('parent');

      expect(sink.records[0]?.fields).not.toHaveProperty('module');
    });

    it('merges nested child bindings', () => {
      const { logger, sink } = setup();

      logger.child({ a: 1 }).child({ b: 2 }).info('m');

      expect(sink.records[0]?.fields).toEqual({ a: 1, b: 2 });
    });

    it('applies level filtering to children', () => {
      const { logger, sink } = setup({ level: LogLevel.Error });

      logger.child({ x: 1 }).warn('ignored');

      expect(sink.records).toHaveLength(0);
    });

    it('redacts child bindings too', () => {
      const { logger, sink } = setup();

      logger.child({ token: 'abc' }).info('m');

      expect(sink.records[0]?.fields).toEqual({ token: R });
    });
  });

  describe('redaction', () => {
    it('redacts sensitive fields and text in the message', () => {
      const { logger, sink } = setup();

      logger.info('call https://u:p@h/?token=1', {
        otp: '123456',
        sessionId: 'x',
      });

      expect(sink.records[0]).toMatchObject({
        message: `call https://${R}@h/?token=${R}`,
      });
      expect(sink.records[0]?.fields).toEqual({ otp: R, sessionId: 'x' });
    });

    it('never mutates the caller object', () => {
      const { logger } = setup();
      const fields = { nested: { password: 'p', keep: 1 } };

      logger.info('m', fields);

      expect(fields).toEqual({ nested: { password: 'p', keep: 1 } });
    });

    it('serializes an Error field through the redactor', () => {
      const { logger, sink } = setup();
      const err = new TypeError('bad input');

      logger.error('failed', { err });

      expect(sink.records[0]?.fields).toEqual({
        err: { name: 'TypeError', message: 'bad input', stack: err.stack },
      });
    });

    it('handles circular references without throwing', () => {
      const { logger, sink } = setup();
      const obj: Record<string, unknown> = { name: 'loop' };
      obj.self = obj;

      logger.info('circular', { obj });

      expect(sink.records[0]?.fields).toEqual({
        obj: { name: 'loop', self: '[Circular]' },
      });
    });
  });
});
