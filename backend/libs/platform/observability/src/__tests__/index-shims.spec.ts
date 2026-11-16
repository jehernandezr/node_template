import { ROOT_CONTEXT } from '@opentelemetry/api';
import {
  contextFromTraceparent,
  currentTraceparent,
  parseTraceparent,
  RequestContext,
  RequestContextStore,
  withSpan,
} from '../index.js';

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const SPAN_ID = 'b7ad6b7169203331';

describe('index compatibility shims', () => {
  it('parseTraceparent reads a valid header', () => {
    expect(parseTraceparent(`00-${TRACE_ID}-${SPAN_ID}-01`)).toEqual({
      traceId: TRACE_ID,
      spanId: SPAN_ID,
      sampled: true,
    });
  });

  it.each([undefined, null, '00-bad', ''])(
    'parseTraceparent returns null for %p',
    (header) => {
      expect(parseTraceparent(header)).toBeNull();
    },
  );

  it('contextFromTraceparent returns the base context for an invalid header', () => {
    expect(contextFromTraceparent('00-bad')).toBe(ROOT_CONTEXT);
  });

  it('withSpan runs fn and returns its value', async () => {
    await expect(withSpan('shim.op', () => 42)).resolves.toBe(42);
  });

  it('withSpan rethrows the error of fn', async () => {
    await expect(
      withSpan('shim.fail', () => {
        throw new RangeError('out of range');
      }),
    ).rejects.toThrow('out of range');
  });

  it('currentTraceparent is undefined outside a span', () => {
    expect(currentTraceparent()).toBeUndefined();
  });

  it('RequestContext.run is visible from RequestContextStore.shared()', () => {
    RequestContext.run({ tenantId: 'tenant-index' }, () => {
      expect(RequestContextStore.shared().current()?.tenantId).toBe(
        'tenant-index',
      );
    });
  });
});
