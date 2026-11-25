import { AsyncBloomFilter } from '../../async-bloom-filter.js';
import { BloomMath } from '../../bloom-math.js';
import { BloomFilter } from '../../bloom-filter.js';
import { BloomHashScheme } from '../../bloom-hash-scheme.enum.js';
import { InMemoryAsyncBloomFilter } from '../../in-memory-async-bloom-filter.js';
import {
  BLOOM_FORMAT_VERSION,
  type SerializedBloomFilter,
} from '../../serialized-bloom-filter.js';

/** Bloom test data: filled filters, item lists and serialized forms. */
export class BloomFixtures {
  /** Filter with `count` items `item-0`, `item-1`... inserted at 1 %. */
  static filledFilter(count: number): BloomFilter {
    const filter = BloomFilter.create({ expectedItems: count });
    for (const item of BloomFixtures.items('item', count)) {
      filter.add(item);
    }
    return filter;
  }

  /** `count` items with the given prefix: `prefix-0`, `prefix-1`... */
  static items(prefix: string, count: number): string[] {
    const items: string[] = [];
    for (let i = 0; i < count; i += 1) {
      items.push(`${prefix}-${i}`);
    }
    return items;
  }

  /** Returns how many of the given items the filter says it might contain. */
  static async countPositive(
    filter: AsyncBloomFilter,
    items: readonly string[],
  ): Promise<number> {
    let positives = 0;
    for (const item of items) {
      if (await filter.mightContain(item)) {
        positives += 1;
      }
    }
    return positives;
  }

  /** Returns how many of the given items the synchronous filter says it might contain. */
  static countPositiveSync(
    filter: BloomFilter,
    items: readonly string[],
  ): number {
    return items.filter((item) => filter.mightContain(item)).length;
  }

  /** Returns a valid serialized form, with the requested fields overridden. */
  static validSerialized(
    overrides: Partial<Record<keyof SerializedBloomFilter, unknown>>,
  ): SerializedBloomFilter {
    const base = {
      version: BLOOM_FORMAT_VERSION,
      scheme: BloomHashScheme.EnhancedDoubleHashing,
      bits: 16,
      hashes: 2,
      data: 'AAA=',
      ...overrides,
    };
    return base as SerializedBloomFilter;
  }

  /** In-memory filters, one per partition, for partition tests. */
  static inMemoryPartitions(
    count: number,
    expectedItems: number,
  ): InMemoryAsyncBloomFilter[] {
    const parts: InMemoryAsyncBloomFilter[] = [];
    for (let i = 0; i < count; i += 1) {
      parts.push(
        new InMemoryAsyncBloomFilter(BloomFilter.create({ expectedItems })),
      );
    }
    return parts;
  }

  /** Inserts all items into the filter. */
  static addAll(filter: BloomFilter, items: readonly string[]): void {
    for (const item of items) {
      filter.add(item);
    }
  }

  /** Returns how many items fall into each partition. */
  static partitionCounts(
    items: readonly string[],
    partitions: number,
  ): number[] {
    const counts = Array.from({ length: partitions }, () => 0);
    for (const item of items) {
      counts[BloomMath.partitionOf(item, partitions)] += 1;
    }
    return counts;
  }
}
