import {
  FixedRandomSource,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import type { RequestContextData } from '../../context/request-context-data.js';
import { RequestContextStore } from '../../context/request-context-store.js';
import { DebugSampler } from '../../logging/debug-sampler.js';
import { Redactor } from '../../redaction/redactor.js';
import { TraceContextCodec } from '../../propagation/trace-context-codec.js';
import { Tracing } from '../../tracing/tracing.js';
import { RequestContextMiddleware } from '../request-context.middleware.js';
import { RecordingResponse } from './utils/recording-response.js';

const EXTERNAL_TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';
const EXTERNAL_SPAN = '00f067aa0ba902b7';

describe('RequestContextMiddleware', () => {
  const store = new RequestContextStore(new Tracing(new Redactor()));
  const codec = new TraceContextCodec(
    new SequentialIdGenerator(),
    new FixedRandomSource([0.5], 0xab),
  );

  function runWith(
    headers: Record<string, string | string[] | undefined>,
    sampler = new DebugSampler(1, new FixedRandomSource()),
  ): { context: RequestContextData | undefined; response: RecordingResponse } {
    const middleware = new RequestContextMiddleware(store, codec, sampler);
    const response = new RecordingResponse();
    const captured: { context?: RequestContextData } = {};

    middleware.use({ headers }, response, () => {
      captured.context = store.current();
    });
    return { context: captured.context, response };
  }

  it('opens a request context with a 32 hex traceId and returns it in x-trace-id', () => {
    const { context, response } = runWith({});

    expect(context?.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(response.headers.get(RequestContextMiddleware.TRACE_ID_HEADER)).toBe(
      context?.traceId,
    );
  });

  it('keeps a valid incoming traceparent as externalTraceId and not as the traceId', () => {
    const { context } = runWith({
      traceparent: `00-${EXTERNAL_TRACE}-${EXTERNAL_SPAN}-01`,
    });

    expect(context?.externalTraceId).toBe(EXTERNAL_TRACE);
    expect(context?.traceId).not.toBe(EXTERNAL_TRACE);
  });

  it.each([
    ['a malformed value', 'garbage'],
    ['an all-zero trace id', `00-${'0'.repeat(32)}-${EXTERNAL_SPAN}-01`],
  ])('ignores an invalid traceparent: %s', (_label, traceparent) => {
    const { context } = runWith({ traceparent });

    expect(context?.externalTraceId).toBeUndefined();
  });

  it('reads the first traceparent when the header arrives as an array', () => {
    const { context } = runWith({
      traceparent: [`00-${EXTERNAL_TRACE}-${EXTERNAL_SPAN}-01`, 'ignored'],
    });

    expect(context?.externalTraceId).toBe(EXTERNAL_TRACE);
  });

  it.each([
    [1, true],
    [0, false],
  ])(
    'sets debugSampled from a sampler with rate %p to %p',
    (rate, expected) => {
      const sampler = new DebugSampler(rate, new FixedRandomSource());

      const { context } = runWith({}, sampler);

      expect(context?.debugSampled).toBe(expected);
    },
  );
});
