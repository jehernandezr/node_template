import { InvalidParameters } from './bloom-error.js';
import { BloomFilter } from './bloom-filter.js';
import { MAX_BITS } from './limits.js';
import {
  DEFAULT_FALSE_POSITIVE_RATE,
  optimalParameters,
  requiredBits,
} from './optimal-parameters.js';

describe('optimalParameters', () => {
  it('computes the classic sizing for 1_000_000 items at 1 %', () => {
    expect(optimalParameters(1_000_000, 0.01)).toEqual({
      bits: 9_585_059,
      hashes: 7,
    });
  });

  it('always uses at least one hash', () => {
    expect(optimalParameters(1, 0.99).hashes).toBeGreaterThanOrEqual(1);
  });

  it.each([
    [0, 0.01],
    [1.5, 0.01],
    [-1, 0.01],
    [10, 0],
    [10, 1],
    [10, 1.5],
    [10, Number.NaN],
  ])('rejects expectedItems=%p falsePositiveRate=%p', (items, rate) => {
    expect(() => optimalParameters(items, rate)).toThrow(InvalidParameters);
  });

  it('rejects results that exceed the hash bound', () => {
    // k = round(ln 2 * m / n) is about 40 at p = 1e-12
    expect(() => optimalParameters(1_000, 1e-12)).toThrow(InvalidParameters);
  });

  it('rejects results that exceed the bit bound', () => {
    expect(() => optimalParameters(Number.MAX_SAFE_INTEGER, 0.5)).toThrow(
      InvalidParameters,
    );
  });
});

describe('default false positive rate', () => {
  it('is 1 % when a filter does not declare one', () => {
    expect(DEFAULT_FALSE_POSITIVE_RATE).toBe(0.01);
    expect(optimalParameters(1_000_000)).toEqual(
      optimalParameters(1_000_000, 0.01),
    );
    const filter = BloomFilter.create({ expectedItems: 1_000_000 });
    expect(filter.bits).toBe(9_585_059);
  });

  // Audit PLAT-15: one filter of 2^32 bits does not hold the HIBP list at 1 %.
  it('shows why HIBP needs partitions', () => {
    expect(requiredBits(1_000_000_000)).toBeGreaterThan(MAX_BITS);
    expect(() => optimalParameters(1_000_000_000)).toThrow(InvalidParameters);
  });
});
