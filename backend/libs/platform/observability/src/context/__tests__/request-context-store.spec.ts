import { context, trace, TraceFlags } from '@opentelemetry/api';
import { StackContextManager } from '@opentelemetry/sdk-trace';
import { ActorType } from '../actor-type.enum.js';
import { Redactor } from '../../redaction/redactor.js';
import { Tracing } from '../../tracing/tracing.js';
import { RequestContextStore } from '../request-context-store.js';

const TRACE_ID = '0193f1c27a4b7c3d8e5f0123456789ab';
const SPAN_ID = 'b7ad6b7169203331';
const SPAN_TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';
const SPAN_SPAN = '00f067aa0ba902b7';

describe('RequestContextStore', () => {
  const manager = new StackContextManager();

  beforeAll(() => {
    context.setGlobalContextManager(manager.enable());
  });

  afterAll(() => {
    context.disable();
  });

  const store = new RequestContextStore(new Tracing(new Redactor()));

  it('normalizes the traceId once and keeps actor, region and externalTraceId', () => {
    store.run(
      {
        traceId: '0193F1C2-7A4B-7C3D-8E5F-0123456789AB',
        spanId: SPAN_ID,
        externalTraceId: SPAN_TRACE,
        tenantId: 't-1',
        actorId: 'sa-1',
        actorType: ActorType.ServiceAccount,
        region: 'co',
      },
      () => {
        expect(store.current()).toEqual({
          traceId: TRACE_ID,
          spanId: SPAN_ID,
          externalTraceId: SPAN_TRACE,
          tenantId: 't-1',
          actorId: 'sa-1',
          actorType: ActorType.ServiceAccount,
          region: 'co',
          debugSampled: false,
        });
      },
    );
  });

  it('flags an invalid traceId without keeping its value', () => {
    store.run({ traceId: 'bogus', externalTraceId: 'also-bogus' }, () => {
      expect(store.current()).toEqual({
        traceIdInvalid: true,
        debugSampled: false,
      });
    });
  });

  it('is undefined outside a run', () => {
    expect(store.current()).toBeUndefined();
  });

  it('is undefined inside a span when no context was opened', () => {
    const span = trace.wrapSpanContext({
      traceId: SPAN_TRACE,
      spanId: SPAN_SPAN,
      traceFlags: TraceFlags.SAMPLED,
    });

    context.with(trace.setSpan(context.active(), span), () => {
      expect(store.current()).toBeUndefined();
    });
  });

  it('keeps the context across awaits', async () => {
    await store.run({ tenantId: 'tenant-a' }, async () => {
      await Promise.resolve();
      expect(store.current()?.tenantId).toBe('tenant-a');
    });
  });

  it('takes trace and span ids from the active OpenTelemetry span', () => {
    const span = trace.wrapSpanContext({
      traceId: SPAN_TRACE,
      spanId: SPAN_SPAN,
      traceFlags: TraceFlags.SAMPLED,
    });

    context.with(trace.setSpan(context.active(), span), () => {
      store.run({ traceId: 'bogus', tenantId: 't-1' }, () => {
        expect(store.current()).toEqual({
          traceId: SPAN_TRACE,
          spanId: SPAN_SPAN,
          tenantId: 't-1',
          debugSampled: false,
        });
      });
    });
  });

  it('does not share the context between two stores', () => {
    const other = new RequestContextStore(new Tracing(new Redactor()));

    store.run({ tenantId: 'only-here' }, () => {
      expect(other.current()).toBeUndefined();
    });
  });

  it('stores the debugSampled flag of the init', () => {
    store.run({ debugSampled: true }, () => {
      expect(store.current()?.debugSampled).toBe(true);
    });
  });
});
