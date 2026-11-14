import { InvalidParameters } from './bloom-error.js';
import {
  MAX_BITS,
  MAX_HASHES,
  MIN_BITS,
  MIN_HASHES,
  assertIntegerInRange,
} from './limits.js';

/** False positive rate a filter gets when it does not declare one (1 %, as the plan requires). */
export const DEFAULT_FALSE_POSITIVE_RATE = 0.01;

/** Bit array size and hash count of a bloom filter. */
export interface BloomParameters {
  readonly bits: number;
  readonly hashes: number;
}

/**
 * Bits an optimal filter needs, without the {@link MAX_BITS} cap: m = ceil(-n * ln p / (ln 2)^2).
 * Use it to size partitions when one filter is not enough (see `partitionCount`).
 * @throws {InvalidParameters} when an input is out of range.
 */
export function requiredBits(
  expectedItems: number,
  falsePositiveRate: number = DEFAULT_FALSE_POSITIVE_RATE,
): number {
  if (!Number.isSafeInteger(expectedItems) || expectedItems < 1) {
    throw new InvalidParameters(
      `expectedItems must be an integer >= 1, got ${expectedItems}`,
    );
  }
  if (!(falsePositiveRate > 0 && falsePositiveRate < 1)) {
    throw new InvalidParameters(
      `falsePositiveRate must be in (0, 1), got ${falsePositiveRate}`,
    );
  }
  const ln2 = Math.LN2;
  return Math.ceil(
    (-expectedItems * Math.log(falsePositiveRate)) / (ln2 * ln2),
  );
}

/**
 * Computes the bit array size and hash count for a target false positive rate.
 * m = ceil(-n * ln p / (ln 2)^2), k = max(1, round(m / n * ln 2)).
 * @param expectedItems expected number of inserted items (integer >= 1).
 * @param falsePositiveRate target false positive rate, strictly between 0 and 1. Default
 *   {@link DEFAULT_FALSE_POSITIVE_RATE}.
 * @throws {InvalidParameters} when an input is out of range or the result exceeds the
 *   supported bounds (bits in [1, 2^32], hashes in [1, 32]).
 */
export function optimalParameters(
  expectedItems: number,
  falsePositiveRate: number = DEFAULT_FALSE_POSITIVE_RATE,
): BloomParameters {
  const bits = requiredBits(expectedItems, falsePositiveRate);
  const hashes = Math.max(1, Math.round((bits / expectedItems) * Math.LN2));
  if (!(bits <= MAX_BITS)) {
    throw new InvalidParameters(
      `required bits ${bits} exceed the maximum ${MAX_BITS}`,
    );
  }
  assertIntegerInRange(bits, MIN_BITS, MAX_BITS, 'bits');
  assertIntegerInRange(hashes, MIN_HASHES, MAX_HASHES, 'hashes');
  return { bits, hashes };
}
