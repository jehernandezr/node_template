import {
  FixedRandomSource,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import { ObservabilityErrorCode } from '../../errors/observability-error-code.enum.js';
import { InvalidTraceContextError } from '../../errors/invalid-trace-context.error.js';
import { TraceContextCodec } from '../trace-context-codec.js';

const HEX = '0193f1c27a4b7c3d8e5f0123456789ab';
const UUID = '0193f1c2-7a4b-7c3d-8e5f-0123456789ab';
const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const SPAN_ID = 'b7ad6b7169203331';
const HOSTILE = 'attacker-controlled-value';

describe('TraceContextCodec', () => {
  const codec = new TraceContextCodec(
    new SequentialIdGenerator(),
    new FixedRandomSource([0.5], 0xab),
  );

  describe('newTraceId', () => {
    it('returns the UUIDv7 without hyphens as a W3C trace id', () => {
      expect(codec.newTraceId()).toBe('01941f297c0070008000000000000001');
    });

    it('generates a different id on each call', () => {
      expect(codec.newTraceId()).not.toBe(codec.newTraceId());
    });
  });

  describe('newSpanId', () => {
    it('encodes eight random bytes as 16 lowercase hex chars', () => {
      expect(codec.newSpanId()).toBe('abababababababab');
    });
  });

  describe('isTraceId and isSpanId', () => {
    it.each([
      [HEX, true],
      [TRACE_ID.toUpperCase(), false],
      ['0'.repeat(32), false],
      [`${HEX}00`, false],
      [42, false],
    ])('isTraceId(%p) is %p', (value, expected) => {
      expect(TraceContextCodec.isTraceId(value)).toBe(expected);
    });

    it.each([
      [SPAN_ID, true],
      ['0'.repeat(16), false],
      ['B7AD6B7169203331', false],
      [undefined, false],
    ])('isSpanId(%p) is %p', (value, expected) => {
      expect(TraceContextCodec.isSpanId(value)).toBe(expected);
    });
  });

  describe('normalizeTraceId', () => {
    it('normalizes a hyphenated UUIDv7 to 32 hex', () => {
      expect(TraceContextCodec.normalizeTraceId(UUID)).toBe(HEX);
    });

    it('accepts 32 hex in uppercase with surrounding spaces', () => {
      expect(
        TraceContextCodec.normalizeTraceId(` ${UUID.toUpperCase()} `),
      ).toBe(HEX);
      expect(TraceContextCodec.normalizeTraceId(HEX)).toBe(HEX);
    });

    it.each([
      undefined,
      null,
      42,
      '',
      'abc',
      '0'.repeat(32),
      '00000000-0000-0000-0000-000000000000',
      `${HEX}00`,
      '0193f1c2-7a4b-7c3d-8e5f',
      'z'.repeat(32),
    ])('returns undefined for %p without throwing', (value) => {
      expect(TraceContextCodec.normalizeTraceId(value)).toBeUndefined();
    });
  });

  describe('normalizeSpanId', () => {
    it('lowercases a valid span id', () => {
      expect(TraceContextCodec.normalizeSpanId('B7AD6B7169203331')).toBe(
        SPAN_ID,
      );
    });

    it('returns undefined for an invalid span id', () => {
      expect(TraceContextCodec.normalizeSpanId('nope')).toBeUndefined();
    });
  });

  describe('formatTraceparent', () => {
    it('formats sampled and unsampled headers', () => {
      expect(
        TraceContextCodec.formatTraceparent({
          traceId: TRACE_ID,
          spanId: SPAN_ID,
          sampled: true,
        }),
      ).toBe(`00-${TRACE_ID}-${SPAN_ID}-01`);
      expect(
        TraceContextCodec.formatTraceparent({
          traceId: TRACE_ID,
          spanId: SPAN_ID,
          sampled: false,
        }),
      ).toBe(`00-${TRACE_ID}-${SPAN_ID}-00`);
    });

    it.each([
      [
        { traceId: HOSTILE, spanId: SPAN_ID, sampled: true },
        'trace id of 32 lowercase hex chars',
      ],
      [
        { traceId: HEX, spanId: HOSTILE, sampled: true },
        'span id of 16 lowercase hex chars',
      ],
    ])(
      'throws an InvalidTraceContextError that does not echo the input',
      (fields, expectation) => {
        expect(() => TraceContextCodec.formatTraceparent(fields)).toThrow(
          InvalidTraceContextError,
        );
        expect(() => TraceContextCodec.formatTraceparent(fields)).toThrow(
          `Invalid trace context: ${expectation}`,
        );
      },
    );

    it('marks the error with the observability code', () => {
      expect(
        new InvalidTraceContextError('trace id of 32 lowercase hex chars'),
      ).toMatchObject({
        code: ObservabilityErrorCode.InvalidTraceContext,
      });
    });
  });

  describe('parseTraceparent', () => {
    it('round trips a formatted header', () => {
      const header = TraceContextCodec.formatTraceparent({
        traceId: TRACE_ID,
        spanId: SPAN_ID,
        sampled: true,
      });

      expect(TraceContextCodec.parseTraceparent(header)).toEqual({
        traceId: TRACE_ID,
        spanId: SPAN_ID,
        sampled: true,
      });
    });

    it('parses the unsampled flag', () => {
      expect(
        TraceContextCodec.parseTraceparent(`00-${TRACE_ID}-${SPAN_ID}-00`)
          ?.sampled,
      ).toBe(false);
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
      expect(
        TraceContextCodec.parseTraceparent(header as string | null | undefined),
      ).toBeNull();
    });
  });

  describe('toDisplayTraceId', () => {
    it('formats 32 hex chars as UUID 8-4-4-4-12', () => {
      expect(TraceContextCodec.toDisplayTraceId(TRACE_ID)).toBe(
        '0af76519-16cd-43dd-8448-eb211c80319c',
      );
    });

    it('is the inverse of the hyphen removal', () => {
      expect(TraceContextCodec.toDisplayTraceId(HEX)).toBe(UUID);
    });

    it('throws an error that does not echo the input', () => {
      expect(() => TraceContextCodec.toDisplayTraceId(HOSTILE)).toThrow(
        'Invalid trace context: trace id of 32 lowercase hex chars',
      );
    });
  });
});
