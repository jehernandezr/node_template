import { FixedRandomSource } from '@platform/kernel/test-utils';
import { CacheErrorCode } from '../errors/cache-error-code.enum.js';
import { TtlJitter } from '../ttl-jitter.js';

describe('TtlJitter', () => {
  it.each([
    [0, 900],
    [0.5, 1_000],
    [0.999999, 1_100],
  ])('maps the sample %p to the TTL %p around 1000 ms', (sample, expected) => {
    const jitter = new TtlJitter(new FixedRandomSource([sample]));
    expect(jitter.jitter(1_000)).toBe(expected);
  });

  it('stays inside the range for a base of zero', () => {
    const jitter = new TtlJitter(new FixedRandomSource([0.9]));
    expect(jitter.jitter(0)).toBe(0);
  });

  it('falls back to the lower bound when the sample is not a number', () => {
    const jitter = new TtlJitter(new FixedRandomSource([Number.NaN]));
    expect(jitter.jitter(1_000)).toBe(900);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the base %p',
    (baseMs) => {
      const jitter = new TtlJitter(new FixedRandomSource([0.5]));
      expect(() => jitter.jitter(baseMs)).toThrow(
        expect.objectContaining({ code: CacheErrorCode.InvalidArgument }),
      );
    },
  );

  it.each([-0.1, 1.5, Number.NaN])('rejects the ratio %p', (ratio) => {
    const jitter = new TtlJitter(new FixedRandomSource([0.5]));
    expect(() => jitter.jitter(1_000, ratio)).toThrow(
      expect.objectContaining({ code: CacheErrorCode.InvalidArgument }),
    );
  });
});
