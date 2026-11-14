import type { AsyncBloomFilter } from './async-bloom-filter.js';
import { InvalidParameters } from './bloom-error.js';
import { murmur3_32 } from './hashing.js';
import { MAX_BITS } from './limits.js';
import {
  DEFAULT_FALSE_POSITIVE_RATE,
  requiredBits,
} from './optimal-parameters.js';

/**
 * Seed of the hash that picks the partition. It differs from the hashes that pick bit positions (FNV-1a and
 * MurmurHash3 with seed 0), so the items of one partition still spread over all of its bits.
 */
export const PARTITION_HASH_SEED = 0x5bd1e995;

/** Largest number of partitions accepted. */
export const MAX_PARTITIONS = 4_096;

/**
 * Partitions needed so that each one fits in `maxBitsPerPartition` at the target rate.
 * For example, 1.5 billion items at 1 % need about 14.4 billion bits: 4 partitions of at most 2^32 bits.
 * @throws {InvalidParameters} for out-of-range inputs, or when more than {@link MAX_PARTITIONS} are needed.
 */
export function partitionCount(
  expectedItems: number,
  falsePositiveRate: number = DEFAULT_FALSE_POSITIVE_RATE,
  maxBitsPerPartition: number = MAX_BITS,
): number {
  if (
    !Number.isSafeInteger(maxBitsPerPartition) ||
    maxBitsPerPartition < 1 ||
    maxBitsPerPartition > MAX_BITS
  ) {
    throw new InvalidParameters(
      `maxBitsPerPartition must be an integer in [1, ${MAX_BITS}], got ${maxBitsPerPartition}`,
    );
  }
  const count = Math.ceil(
    requiredBits(expectedItems, falsePositiveRate) / maxBitsPerPartition,
  );
  if (count > MAX_PARTITIONS) {
    throw new InvalidParameters(
      `${count} partitions needed; the maximum is ${MAX_PARTITIONS}`,
    );
  }
  return count;
}

/**
 * Partition of an item among `partitions`: MurmurHash3 with {@link PARTITION_HASH_SEED}, modulo the count.
 * The rebuild job of a partitioned filter uses it to feed each partition only its own items.
 */
export function partitionOf(item: string, partitions: number): number {
  return murmur3_32(item, PARTITION_HASH_SEED) % partitions;
}

/**
 * One logical filter spread over several filters by a hash of the item. Each item lives in exactly one
 * partition, so the false positive rate of the whole is the rate of each partition. Use it when a set does
 * not fit in one filter: the Have I Been Pwned list does not fit in one 2^32-bit filter at 1 %, and the
 * Valkey `BF.*` module caps each filter's memory (`bf.bloom-memory-usage-limit`, 128 MiB by default).
 *
 * Size each partition for `expectedItems / partitions` items. Rebuild each partition separately, feeding it
 * the items for which {@link partitionOf} returns its index.
 */
export class PartitionedBloomFilter implements AsyncBloomFilter {
  private readonly partitions: readonly AsyncBloomFilter[];

  /** @throws {InvalidParameters} with no partitions or more than {@link MAX_PARTITIONS}. */
  constructor(partitions: readonly AsyncBloomFilter[]) {
    if (partitions.length === 0 || partitions.length > MAX_PARTITIONS) {
      throw new InvalidParameters(
        `partitions must have between 1 and ${MAX_PARTITIONS} filters, got ${partitions.length}`,
      );
    }
    this.partitions = [...partitions];
  }

  /** Number of partitions. */
  get size(): number {
    return this.partitions.length;
  }

  add(item: string): Promise<void> {
    return this.partitionFor(item).add(item);
  }

  async addMany(items: readonly string[]): Promise<void> {
    const batches = new Map<number, string[]>();
    for (const item of items) {
      const index = partitionOf(item, this.partitions.length);
      const batch = batches.get(index);
      if (batch === undefined) {
        batches.set(index, [item]);
      } else {
        batch.push(item);
      }
    }
    await Promise.all(
      [...batches].map(([index, batch]) =>
        this.partitions[index].addMany(batch),
      ),
    );
  }

  mightContain(item: string): Promise<boolean> {
    return this.partitionFor(item).mightContain(item);
  }

  private partitionFor(item: string): AsyncBloomFilter {
    return this.partitions[partitionOf(item, this.partitions.length)];
  }
}
