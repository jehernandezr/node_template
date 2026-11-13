import {
  formatTraceparent,
  isSpanId,
  isTraceId,
  newTraceId,
  normalizeSpanId,
  normalizeTraceId,
  toDisplayTraceId,
} from './trace.js';

const HEX = '0193f1c27a4b7c3d8e5f0123456789ab';
const UUID = '0193f1c2-7a4b-7c3d-8e5f-0123456789ab';

describe('UUIDv7 to W3C trace id mapping', () => {
  it('normalizes a hyphenated UUIDv7 to 32 hex and back', () => {
    expect(normalizeTraceId(UUID)).toBe(HEX);
    expect(toDisplayTraceId(HEX)).toBe(UUID);
  });

  it('accepts 32 hex, uppercase and surrounding spaces', () => {
    expect(normalizeTraceId(HEX)).toBe(HEX);
    expect(normalizeTraceId(` ${UUID.toUpperCase()} `)).toBe(HEX);
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
    expect(normalizeTraceId(value)).toBeUndefined();
  });

  it('a generated trace id is a valid W3C trace id with the UUIDv7 version nibble', () => {
    const traceId = newTraceId();
    expect(isTraceId(traceId)).toBe(true);
    expect(traceId[12]).toBe('7');
  });

  it('validates span ids', () => {
    expect(isSpanId('b7ad6b7169203331')).toBe(true);
    expect(isSpanId('0'.repeat(16))).toBe(false);
    expect(normalizeSpanId('B7AD6B7169203331')).toBe('b7ad6b7169203331');
    expect(normalizeSpanId('nope')).toBeUndefined();
  });
});

describe('RangeError messages do not echo the input (PLAT-03)', () => {
  const hostile = 'attacker-controlled-value';

  it('toDisplayTraceId', () => {
    expect(() => toDisplayTraceId(hostile)).toThrow(RangeError);
    try {
      toDisplayTraceId(hostile);
    } catch (error) {
      expect((error as Error).message).not.toContain(hostile);
    }
  });

  it('formatTraceparent', () => {
    for (const fields of [
      { traceId: hostile, spanId: 'b7ad6b7169203331', sampled: true },
      { traceId: HEX, spanId: hostile, sampled: true },
    ]) {
      try {
        formatTraceparent(fields);
        throw new Error('expected a RangeError');
      } catch (error) {
        expect(error).toBeInstanceOf(RangeError);
        expect((error as Error).message).not.toContain(hostile);
      }
    }
  });
});
