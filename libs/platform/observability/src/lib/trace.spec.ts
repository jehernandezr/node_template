import {
  formatTraceparent,
  newSpanId,
  newTraceId,
  parseTraceparent,
  toDisplayTraceId,
} from './trace.js';

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const SPAN_ID = 'b7ad6b7169203331';

describe('trace utils', () => {
  describe('newTraceId', () => {
    it('returns 32 lowercase hex chars from a UUIDv7', () => {
      const traceId = newTraceId();

      expect(traceId).toMatch(/^[0-9a-f]{32}$/);
      // Version nibble is at position 12 (UUID "7xxx" group) and variant is 8-b.
      expect(traceId[12]).toBe('7');
      expect(['8', '9', 'a', 'b']).toContain(traceId[16]);
    });

    it('generates different ids on each call', () => {
      expect(newTraceId()).not.toBe(newTraceId());
    });
  });

  describe('newSpanId', () => {
    it('returns 16 lowercase hex chars', () => {
      expect(newSpanId()).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('traceparent', () => {
    it('formats a sampled and an unsampled header', () => {
      expect(
        formatTraceparent({
          traceId: TRACE_ID,
          spanId: SPAN_ID,
          sampled: true,
        }),
      ).toBe(`00-${TRACE_ID}-${SPAN_ID}-01`);
      expect(
        formatTraceparent({
          traceId: TRACE_ID,
          spanId: SPAN_ID,
          sampled: false,
        }),
      ).toBe(`00-${TRACE_ID}-${SPAN_ID}-00`);
    });

    it('round trips through parse', () => {
      const header = formatTraceparent({
        traceId: TRACE_ID,
        spanId: SPAN_ID,
        sampled: true,
      });

      expect(parseTraceparent(header)).toEqual({
        traceId: TRACE_ID,
        spanId: SPAN_ID,
        sampled: true,
      });
    });

    it('parses unsampled flags', () => {
      expect(parseTraceparent(`00-${TRACE_ID}-${SPAN_ID}-00`)?.sampled).toBe(
        false,
      );
    });

    it('rejects a generated trace id with its span id', () => {
      const traceId = newTraceId();
      const spanId = newSpanId();
      const parsed = parseTraceparent(
        formatTraceparent({ traceId, spanId, sampled: false }),
      );

      expect(parsed).toEqual({ traceId, spanId, sampled: false });
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['empty string', ''],
      ['wrong version', `01-${TRACE_ID}-${SPAN_ID}-01`],
      ['short trace id', `00-${TRACE_ID.slice(1)}-${SPAN_ID}-01`],
      ['short span id', `00-${TRACE_ID}-${SPAN_ID.slice(1)}-01`],
      ['non-hex trace id', `00-${'z'.repeat(32)}-${SPAN_ID}-01`],
      ['uppercase hex', `00-${TRACE_ID.toUpperCase()}-${SPAN_ID}-01`],
      ['all-zero trace id', `00-${'0'.repeat(32)}-${SPAN_ID}-01`],
      ['all-zero span id', `00-${TRACE_ID}-${'0'.repeat(16)}-01`],
      ['missing flags', `00-${TRACE_ID}-${SPAN_ID}`],
      ['extra segment', `00-${TRACE_ID}-${SPAN_ID}-01-extra`],
      ['bad flags', `00-${TRACE_ID}-${SPAN_ID}-zz`],
      [
        'hyphenated trace id',
        `00-0af76519-16cd-43dd-8448-eb211c80319c-${SPAN_ID}-01`,
      ],
    ])('returns null for %s', (_label, header) => {
      expect(parseTraceparent(header as string | null | undefined)).toBeNull();
    });

    it('throws when formatting an invalid trace id', () => {
      expect(() =>
        formatTraceparent({ traceId: 'nope', spanId: SPAN_ID, sampled: true }),
      ).toThrow(RangeError);
    });

    it('throws when formatting an invalid span id', () => {
      expect(() =>
        formatTraceparent({ traceId: TRACE_ID, spanId: 'nope', sampled: true }),
      ).toThrow(RangeError);
    });
  });

  describe('toDisplayTraceId', () => {
    it('formats 32 hex chars as 8-4-4-4-12', () => {
      expect(toDisplayTraceId(TRACE_ID)).toBe(
        '0af76519-16cd-43dd-8448-eb211c80319c',
      );
    });

    it('throws on an invalid trace id', () => {
      expect(() => toDisplayTraceId('0af7')).toThrow(RangeError);
    });

    it('is the inverse of newTraceId hyphen removal', () => {
      const traceId = newTraceId();
      const display = toDisplayTraceId(traceId);

      expect(display.replace(/-/g, '')).toBe(traceId);
      expect(display).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });
  });
});
