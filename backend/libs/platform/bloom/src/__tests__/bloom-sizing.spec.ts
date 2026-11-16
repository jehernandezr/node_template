import { BloomSizing } from '../bloom-sizing.js';
import { BloomErrorCode } from '../errors/bloom-error-code.enum.js';

describe('BloomSizing', () => {
  it('computes the classic sizing for 1 000 000 items at 1 %', () => {
    expect(BloomSizing.optimalParameters(1_000_000)).toEqual({
      bits: 9_585_059,
      hashes: 7,
    });
  });

  it('always uses at least one hash', () => {
    expect(
      BloomSizing.optimalParameters(10, 0.999).hashes,
    ).toBeGreaterThanOrEqual(1);
  });

  it.each([
    [0, 0.01],
    [-5, 0.01],
    [1.5, 0.01],
    [100, 0],
    [100, 1],
    [100, Number.NaN],
  ])('rejects expectedItems %p and rate %p', (items, rate) => {
    expect(() => BloomSizing.optimalParameters(items, rate)).toThrow(
      expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
    );
  });

  it('rejects results that exceed the hash bound', () => {
    expect(() => BloomSizing.optimalParameters(1_000, 1e-12)).toThrow(
      expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
    );
  });

  it('rejects results that exceed the bit bound', () => {
    expect(() =>
      BloomSizing.optimalParameters(Number.MAX_SAFE_INTEGER, 0.5),
    ).toThrow(
      expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
    );
  });

  it('shows why HIBP needs partitions', () => {
    expect(() => BloomSizing.optimalParameters(1_000_000_000)).toThrow(
      expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
    );
  });

  it('is 1 % when a filter does not declare one', () => {
    expect(BloomSizing.DEFAULT_FALSE_POSITIVE_RATE).toBe(0.01);
  });

  it.each([
    [1_500_000_000, 0.01, BloomSizing.MAX_BITS, 4],
    [1_000, 0.01, BloomSizing.MAX_BITS, 1],
    [1_000_000_000, 0.01, 128 * 1024 * 1024 * 8, 9],
  ])(
    'counts the partitions of %p items at rate %p with %p bits each: %p',
    (items, rate, maxBits, expected) => {
      expect(BloomSizing.partitionCount(items, rate, maxBits)).toBe(expected);
    },
  );

  it.each([0, BloomSizing.MAX_BITS + 1])(
    'rejects a budget of %p bits per partition',
    (maxBits) => {
      expect(() => BloomSizing.partitionCount(10, 0.01, maxBits)).toThrow(
        expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
      );
    },
  );

  it('rejects counts beyond the partition limit', () => {
    expect(() =>
      BloomSizing.partitionCount(Number.MAX_SAFE_INTEGER, 0.01),
    ).toThrow(
      expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
    );
  });

  it('computes the required bits without the cap', () => {
    expect(BloomSizing.requiredBits(1_000_000_000)).toBeGreaterThan(
      BloomSizing.MAX_BITS,
    );
  });
});
