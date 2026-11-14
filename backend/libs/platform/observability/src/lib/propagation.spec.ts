import {
  defaultTextMapGetter,
  defaultTextMapSetter,
  ROOT_CONTEXT,
  trace,
  TraceFlags,
} from '@opentelemetry/api';
import {
  contextFromTraceparent,
  externalTraceIdFrom,
  ExternalTraceparentPropagator,
  IncomingTraceparentPolicy,
} from './propagation.js';

const EXTERNAL_TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';
const EXTERNAL_SPAN = '00f067aa0ba902b7';
const HEADER = `00-${EXTERNAL_TRACE}-${EXTERNAL_SPAN}-01`;

describe('ExternalTraceparentPropagator', () => {
  it('does not continue an external trace by default and keeps it as externalTraceId', () => {
    const propagator = new ExternalTraceparentPropagator();

    const ctx = propagator.extract(
      ROOT_CONTEXT,
      { traceparent: HEADER },
      defaultTextMapGetter,
    );

    expect(trace.getSpanContext(ctx)).toBeUndefined();
    expect(externalTraceIdFrom(ctx)).toBe(EXTERNAL_TRACE);
  });

  it('ignores an invalid external traceparent', () => {
    const propagator = new ExternalTraceparentPropagator();

    const ctx = propagator.extract(
      ROOT_CONTEXT,
      { traceparent: 'garbage' },
      defaultTextMapGetter,
    );

    expect(ctx).toBe(ROOT_CONTEXT);
    expect(externalTraceIdFrom(ctx)).toBeUndefined();
  });

  it('continues the trace with the Continue policy', () => {
    const propagator = new ExternalTraceparentPropagator({
      policy: IncomingTraceparentPolicy.Continue,
    });

    const ctx = propagator.extract(
      ROOT_CONTEXT,
      { traceparent: HEADER },
      defaultTextMapGetter,
    );

    expect(trace.getSpanContext(ctx)?.traceId).toBe(EXTERNAL_TRACE);
    expect(externalTraceIdFrom(ctx)).toBeUndefined();
  });

  it('continues the trace of a trusted carrier', () => {
    const propagator = new ExternalTraceparentPropagator({
      isTrusted: (carrier, getter) =>
        getter.get(carrier, 'x-internal-call') === '1',
    });

    const ctx = propagator.extract(
      ROOT_CONTEXT,
      { traceparent: HEADER, 'x-internal-call': '1' },
      defaultTextMapGetter,
    );

    expect(trace.getSpanContext(ctx)?.spanId).toBe(EXTERNAL_SPAN);
  });

  it('injects the W3C header for outgoing calls', () => {
    const propagator = new ExternalTraceparentPropagator();
    const carrier: Record<string, string> = {};

    propagator.inject(
      contextFromTraceparent(HEADER),
      carrier,
      defaultTextMapSetter,
    );

    expect(carrier['traceparent']).toBe(HEADER);
    expect(propagator.fields()).toContain('traceparent');
  });
});

describe('contextFromTraceparent', () => {
  it('builds a remote parent from a trusted header', () => {
    const spanContext = trace.getSpanContext(contextFromTraceparent(HEADER));

    expect(spanContext).toEqual({
      traceId: EXTERNAL_TRACE,
      spanId: EXTERNAL_SPAN,
      traceFlags: TraceFlags.SAMPLED,
      isRemote: true,
    });
  });

  it('returns the base context for an invalid header', () => {
    expect(contextFromTraceparent(undefined)).toBe(ROOT_CONTEXT);
    expect(contextFromTraceparent('00-bad')).toBe(ROOT_CONTEXT);
  });
});
