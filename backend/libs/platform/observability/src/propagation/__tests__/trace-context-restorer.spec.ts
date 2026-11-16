import { context, ROOT_CONTEXT, trace, TraceFlags } from '@opentelemetry/api';
import { StackContextManager } from '@opentelemetry/sdk-trace';
import { Redactor } from '../../redaction/redactor.js';
import { Tracing } from '../../tracing/tracing.js';
import { TraceContextRestorer } from '../trace-context-restorer.js';

const EXTERNAL_TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';
const EXTERNAL_SPAN = '00f067aa0ba902b7';
const HEADER = `00-${EXTERNAL_TRACE}-${EXTERNAL_SPAN}-01`;

describe('TraceContextRestorer', () => {
  const restorer = new TraceContextRestorer(new Tracing(new Redactor()));

  beforeAll(() => {
    context.setGlobalContextManager(new StackContextManager().enable());
  });

  afterAll(() => {
    context.disable();
  });

  describe('contextFrom', () => {
    it('builds a remote parent from a valid header', () => {
      const spanContext = trace.getSpanContext(restorer.contextFrom(HEADER));

      expect(spanContext).toEqual({
        traceId: EXTERNAL_TRACE,
        spanId: EXTERNAL_SPAN,
        traceFlags: TraceFlags.SAMPLED,
        isRemote: true,
      });
    });

    it('marks an unsampled header without the sampled flag', () => {
      const spanContext = trace.getSpanContext(
        restorer.contextFrom(`00-${EXTERNAL_TRACE}-${EXTERNAL_SPAN}-00`),
      );

      expect(spanContext?.traceFlags).toBe(TraceFlags.NONE);
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a malformed value', '00-bad'],
    ])('returns the base context for %s', (_label, header) => {
      expect(restorer.contextFrom(header)).toBe(ROOT_CONTEXT);
    });

    it('returns the given base context when the header is invalid', () => {
      const base = trace.setSpanContext(ROOT_CONTEXT, {
        traceId: EXTERNAL_TRACE,
        spanId: EXTERNAL_SPAN,
        traceFlags: TraceFlags.SAMPLED,
      });

      expect(restorer.contextFrom('00-bad', base)).toBe(base);
    });
  });

  describe('current', () => {
    it('is undefined outside a span', () => {
      expect(restorer.current()).toBeUndefined();
    });

    it('returns the traceparent of the active span', () => {
      const traceparent = `00-${EXTERNAL_TRACE}-${EXTERNAL_SPAN}-01`;
      const span = trace.wrapSpanContext({
        traceId: EXTERNAL_TRACE,
        spanId: EXTERNAL_SPAN,
        traceFlags: TraceFlags.SAMPLED,
      });

      const current = context.with(trace.setSpan(ROOT_CONTEXT, span), () =>
        restorer.current(),
      );

      expect(current).toBe(traceparent);
    });

    it('runs the function under the restored trace', () => {
      const seen = restorer.run(HEADER, () => restorer.current());

      expect(seen).toBe(HEADER);
    });
  });
});
