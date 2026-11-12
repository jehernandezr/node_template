import { InvalidParameters } from './bloom-error.js';
import { optimalParameters } from './optimal-parameters.js';

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
