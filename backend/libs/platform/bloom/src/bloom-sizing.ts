import { BloomGuard } from './errors/bloom-guard.js';
import { InvalidParametersError } from './errors/invalid-parameters.error.js';
import type { BloomParameters } from './bloom-parameters.js';

/** Filter sizing: bits, hash functions and partitions for a false positive rate. */
export class BloomSizing {
  /** Minimum number of bits allowed. */
  static readonly MIN_BITS = 1;
  /**
   * Largest array size allowed (2^32 bits, 512 MiB), same as the largest Valkey string.
   * At the default 1 % rate it fits about 448 million items: a larger set, such as the
   * Have I Been Pwned password list (over a billion hashes), is split across several filters
   * with `PartitionedBloomFilter`.
   */
  static readonly MAX_BITS = 2 ** 32;
  /** Minimum number of hash functions. */
  static readonly MIN_HASHES = 1;
  /** Maximum number of hash functions. */
  static readonly MAX_HASHES = 32;
  /** Maximum number of partitions of a partitioned filter. */
  static readonly MAX_PARTITIONS = 4_096;
  /** False positive rate of a filter that does not declare one (1 %). */
  static readonly DEFAULT_FALSE_POSITIVE_RATE = 0.01;

  /**
   * Returns the bits an optimal filter needs, without the `MAX_BITS` cap: m = ceil(-n * ln p / (ln 2)^2).
   * Used to size partitions when a single filter is not enough (see `partitionCount`).
   * @param expectedItems Items expected.
   * @param falsePositiveRate Target rate.
   * @returns The bits.
   * @throws InvalidParametersError when an argument is out of range.
   */
  static requiredBits(
    expectedItems: number,
    falsePositiveRate: number = BloomSizing.DEFAULT_FALSE_POSITIVE_RATE,
  ): number {
    BloomGuard.instance.positiveInteger('expectedItems', expectedItems);
    BloomSizing.assertRate(falsePositiveRate);
    const ln2 = Math.LN2;
    return Math.ceil(
      (-expectedItems * Math.log(falsePositiveRate)) / (ln2 * ln2),
    );
  }

  /**
   * Returns the array size and number of hash functions for a target rate.
   * m = ceil(-n * ln p / (ln 2)^2), k = max(1, round(m / n * ln 2)).
   * @param expectedItems Items expected.
   * @param falsePositiveRate Target rate.
   * @returns The parameters.
   * @throws InvalidParametersError when an argument is out of range or the
   *   result exceeds the limits (bits in [1, 2^32], hash functions in [1, 32]).
   */
  static optimalParameters(
    expectedItems: number,
    falsePositiveRate: number = BloomSizing.DEFAULT_FALSE_POSITIVE_RATE,
  ): BloomParameters {
    const bits = BloomSizing.requiredBits(expectedItems, falsePositiveRate);
    const hashes = Math.max(1, Math.round((bits / expectedItems) * Math.LN2));
    BloomGuard.instance.integerInRange(
      'bits',
      bits,
      BloomSizing.MIN_BITS,
      BloomSizing.MAX_BITS,
    );
    BloomGuard.instance.integerInRange(
      'hashes',
      hashes,
      BloomSizing.MIN_HASHES,
      BloomSizing.MAX_HASHES,
    );
    return { bits, hashes };
  }

  /**
   * Returns the partitions needed so each one fits in `maxBitsPerPartition` at the target rate.
   * For example, 1.5 billion items at 1 % need about 14.4 billion bits: 4 partitions
   * of at most 2^32 bits.
   * @param expectedItems Items expected.
   * @param falsePositiveRate Target rate.
   * @param maxBitsPerPartition Cap of each partition.
   * @returns The number of partitions.
   * @throws InvalidParametersError for out-of-range arguments, or when more than `MAX_PARTITIONS` are needed.
   */
  static partitionCount(
    expectedItems: number,
    falsePositiveRate: number = BloomSizing.DEFAULT_FALSE_POSITIVE_RATE,
    maxBitsPerPartition: number = BloomSizing.MAX_BITS,
  ): number {
    BloomGuard.instance.integerInRange(
      'maxBitsPerPartition',
      maxBitsPerPartition,
      BloomSizing.MIN_BITS,
      BloomSizing.MAX_BITS,
    );
    const count = Math.ceil(
      BloomSizing.requiredBits(expectedItems, falsePositiveRate) /
        maxBitsPerPartition,
    );
    if (count > BloomSizing.MAX_PARTITIONS) {
      throw new InvalidParametersError(
        `${count} partitions needed; the maximum is ${BloomSizing.MAX_PARTITIONS}`,
      );
    }
    return count;
  }

  private static assertRate(falsePositiveRate: number): void {
    if (!(falsePositiveRate > 0 && falsePositiveRate < 1)) {
      throw new InvalidParametersError(
        `falsePositiveRate must be in (0, 1), got ${falsePositiveRate}`,
      );
    }
  }
}
