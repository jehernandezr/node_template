import {
  defaultTextMapGetter,
  defaultTextMapSetter,
  ROOT_CONTEXT,
  trace,
  TraceFlags,
} from '@opentelemetry/api';
import { ExternalTraceparentPropagator } from '../external-traceparent-propagator.js';
import { IncomingTraceparentPolicy } from '../incoming-traceparent-policy.enum.js';
import { TraceContextRestorer } from '../trace-context-restorer.js';
import { Tracing } from '../../tracing/tracing.js';
import { Redactor } from '../../redaction/redactor.js';

const EXTERNAL_TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';
const EXTERNAL_SPAN = '00f067aa0ba902b7';
const HEADER = `00-${EXTERNAL_TRACE}-${EXTERNAL_SPAN}-01`;

describe('ExternalTraceparentPropagator', () => {
  describe('extract with the default External policy', () => {
    it('does not continue an external trace and keeps its trace id as externalTraceId', () => {
      const propagator = new ExternalTraceparentPropagator();

      const ctx = propagator.extract(
        ROOT_CONTEXT,
        { traceparent: HEADER },
        defaultTextMapGetter,
      );

      expect(trace.getSpanContext(ctx)).toBeUndefined();
      expect(ExternalTraceparentPropagator.externalTraceIdFrom(ctx)).toBe(
        EXTERNAL_TRACE,
      );
    });

    it('takes the first value when the header arrives as an array', () => {
      const propagator = new ExternalTraceparentPropagator();

      const ctx = propagator.extract(
        ROOT_CONTEXT,
        { traceparent: [HEADER, 'ignored'] },
        defaultTextMapGetter,
      );

      expect(ExternalTraceparentPropagator.externalTraceIdFrom(ctx)).toBe(
        EXTERNAL_TRACE,
      );
    });

    it('returns the same context when the header is invalid', () => {
      const propagator = new ExternalTraceparentPropagator();

      const ctx = propagator.extract(
        ROOT_CONTEXT,
        { traceparent: 'garbage' },
        defaultTextMapGetter,
      );

      expect(ctx).toBe(ROOT_CONTEXT);
      expect(
        ExternalTraceparentPropagator.externalTraceIdFrom(ctx),
      ).toBeUndefined();
    });
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
    expect(
      ExternalTraceparentPropagator.externalTraceIdFrom(ctx),
    ).toBeUndefined();
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
    const restorer = new TraceContextRestorer(new Tracing(new Redactor()));

    propagator.inject(
      restorer.contextFrom(HEADER),
      carrier,
      defaultTextMapSetter,
    );

    expect(carrier['traceparent']).toBe(HEADER);
    expect(propagator.fields()).toContain('traceparent');
  });

  it('exposes the sampled flag of a trusted header', () => {
    const propagator = new ExternalTraceparentPropagator({
      policy: IncomingTraceparentPolicy.Continue,
    });

    const ctx = propagator.extract(
      ROOT_CONTEXT,
      { traceparent: `00-${EXTERNAL_TRACE}-${EXTERNAL_SPAN}-00` },
      defaultTextMapGetter,
    );

    expect(trace.getSpanContext(ctx)?.traceFlags).toBe(TraceFlags.NONE);
  });

  it('returns undefined from externalTraceIdFrom for a context without the key', () => {
    expect(
      ExternalTraceparentPropagator.externalTraceIdFrom(ROOT_CONTEXT),
    ).toBeUndefined();
  });
});
