import { FixedClock } from '@platform/kernel/test-utils';
import { RetryAfterHint } from '../retry-after-hint.js';

const NOW = new Date('2025-01-01T00:00:00.000Z');

describe('RetryAfterHint', () => {
  const hint = new RetryAfterHint(new FixedClock(NOW));

  it('reads a numeric retryAfterMs and rounds it up', () => {
    expect(hint.hintMs({ retryAfterMs: 1200.2 })).toBe(1201);
  });

  it.each<[string, unknown, number | undefined]>([
    [
      'seconds in a plain headers object',
      { headers: { 'retry-after': '3' } },
      3000,
    ],
    ['seconds in a headers getter', { headers: { get: () => '2' } }, 2000],
    [
      'seconds in response headers',
      { response: { headers: { 'retry-after': 4 } } },
      4000,
    ],
    [
      'an HTTP date',
      { headers: { 'retry-after': 'Wed, 01 Jan 2025 00:00:10 GMT' } },
      10_000,
    ],
    [
      'a header getter returning no string',
      { headers: { get: () => 5 } },
      undefined,
    ],
    [
      'a header that is not a string or number',
      { headers: { 'retry-after': {} } },
      undefined,
    ],
    ['no hint', new Error('plain'), undefined],
    ['a primitive', 'text', undefined],
    ['a null value', null, undefined],
  ])('reads %s', (_label, error, expected) => {
    expect(hint.hintMs(error)).toBe(expected);
  });

  it('bounds the hint to the maximum given', () => {
    expect(hint.hintMs({ retryAfterMs: 90_000 }, 1000)).toBe(1000);
  });

  it('caps unbounded hints at the primitives default', () => {
    expect(hint.hintMs({ retryAfterMs: 9_000_000 })).toBe(60_000);
  });

  it('reads a hint in the cause chain', () => {
    expect(
      hint.hintMs(new Error('outer', { cause: { retryAfterMs: 700 } })),
    ).toBe(700);
  });

  it('ignores a hint deeper than the cause depth limit', () => {
    const deep = new Error('a', {
      cause: new Error('b', {
        cause: new Error('c', {
          cause: new Error('d', { cause: { retryAfterMs: 5 } }),
        }),
      }),
    });
    expect(hint.hintMs(deep)).toBeUndefined();
  });

  it('ignores negative and non-finite numeric hints', () => {
    expect(hint.hintMs({ retryAfterMs: -1 })).toBeUndefined();
    expect(hint.hintMs({ retryAfterMs: Number.NaN })).toBeUndefined();
  });
});
