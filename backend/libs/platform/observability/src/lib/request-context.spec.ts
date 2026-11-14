import { context, trace, TraceFlags } from '@opentelemetry/api';
import { StackContextManager } from '@opentelemetry/sdk-trace';
import { contextFromTraceparent } from './propagation.js';
import { activeSpanIds, ActorType, RequestContext } from './request-context.js';

const TRACE_ID = '0193f1c27a4b7c3d8e5f0123456789ab';
const SPAN_ID = 'b7ad6b7169203331';
const SPAN_TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';
const SPAN_SPAN = '00f067aa0ba902b7';

describe('RequestContext (PLAT-10)', () => {
  const manager = new StackContextManager();

  beforeAll(() => {
    context.setGlobalContextManager(manager.enable());
  });

  afterAll(() => {
    context.disable();
  });

  it('normalizes the traceId once and keeps actor, region and externalTraceId', () => {
    RequestContext.run(
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
        expect(RequestContext.current()).toEqual({
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
    RequestContext.run(
      { traceId: 'bogus', externalTraceId: 'also-bogus' },
      () => {
        const current = RequestContext.current();
        expect(current).toEqual({ traceIdInvalid: true, debugSampled: false });
      },
    );
  });

  it('is undefined outside a run', () => {
    expect(RequestContext.current()).toBeUndefined();
  });

  it('takes trace and span ids from the active OpenTelemetry span', () => {
    const otelCtx = contextFromTraceparent(`00-${SPAN_TRACE}-${SPAN_SPAN}-01`);
    const span = trace.wrapSpanContext({
      traceId: SPAN_TRACE,
      spanId: SPAN_SPAN,
      traceFlags: TraceFlags.SAMPLED,
    });

    context.with(trace.setSpan(otelCtx, span), () => {
      RequestContext.run({ traceId: 'bogus', tenantId: 't-1' }, () => {
        expect(activeSpanIds()).toEqual({
          traceId: SPAN_TRACE,
          spanId: SPAN_SPAN,
          sampled: true,
        });
        expect(RequestContext.current()).toEqual({
          traceId: SPAN_TRACE,
          spanId: SPAN_SPAN,
          tenantId: 't-1',
          debugSampled: false,
        });
      });
    });
  });
});
