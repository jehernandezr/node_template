import { InMemoryAsyncBloomFilter } from './async-bloom-filter.js';
import { InvalidParameters } from './bloom-error.js';
import { BloomFilter } from './bloom-filter.js';
import { MAX_BITS } from './limits.js';
import {
  MAX_PARTITIONS,
  partitionCount,
  partitionOf,
  PartitionedBloomFilter,
} from './partitioned-bloom-filter.js';

function partitions(count: number, expectedItems: number) {
  return Array.from(
    { length: count },
    () => new InMemoryAsyncBloomFilter(BloomFilter.create({ expectedItems })),
  );
}

describe('partitionCount', () => {
  it('sizes the HIBP list at 1 % in partitions of at most 2^32 bits', () => {
    // About 1.5 billion hashes at 1 % need about 14.4 billion bits.
    expect(partitionCount(1_500_000_000)).toBe(4);
    expect(partitionCount(1_000, 0.01)).toBe(1);
  });

  it('honours a smaller budget per partition, such as the BF.* memory limit', () => {
    const bitsIn128MiB = 128 * 1024 * 1024 * 8;
    expect(partitionCount(1_000_000_000, 0.01, bitsIn128MiB)).toBe(9);
  });

  it('rejects invalid budgets and absurd sizes', () => {
    expect(() => partitionCount(10, 0.01, 0)).toThrow(InvalidParameters);
    expect(() => partitionCount(10, 0.01, MAX_BITS + 1)).toThrow(
      InvalidParameters,
    );
    expect(() => partitionCount(Number.MAX_SAFE_INTEGER, 0.01)).toThrow(
      InvalidParameters,
    );
  });
});

describe('PartitionedBloomFilter', () => {
  it('finds every added item, with no false negatives', async () => {
    const filter = new PartitionedBloomFilter(partitions(4, 1_000));
    const items = Array.from({ length: 2_000 }, (_, i) => `hash-${i}`);
    await filter.addMany(items.slice(0, 1_000));
    for (const item of items.slice(1_000, 1_010)) {
      await filter.add(item);
    }
    for (const item of items.slice(0, 1_010)) {
      await expect(filter.mightContain(item)).resolves.toBe(true);
    }
    expect(filter.size).toBe(4);
  });

  it('stores each item in exactly the partition partitionOf names', async () => {
    const parts = partitions(3, 100);
    const filter = new PartitionedBloomFilter(parts);
    const item = 'only-here';
    await filter.add(item);
    const index = partitionOf(item, 3);
    for (const [i, part] of parts.entries()) {
      await expect(part.mightContain(item)).resolves.toBe(i === index);
    }
  });

  it('spreads items evenly over the partitions', () => {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 40_000; i += 1) {
      counts[partitionOf(`item-${i}`, 4)] += 1;
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(9_000);
      expect(count).toBeLessThan(11_000);
    }
  });

  it('keeps the false positive rate of one partition', async () => {
    const filter = new PartitionedBloomFilter(partitions(4, 2_500));
    await filter.addMany(
      Array.from({ length: 10_000 }, (_, i) => `member-${i}`),
    );
    let positives = 0;
    for (let i = 0; i < 10_000; i += 1) {
      if (await filter.mightContain(`absent-${i}`)) {
        positives += 1;
      }
    }
    expect(positives / 10_000).toBeLessThan(0.02);
  });

  it('rejects an empty or oversized partition list', () => {
    expect(() => new PartitionedBloomFilter([])).toThrow(InvalidParameters);
    expect(
      () =>
        new PartitionedBloomFilter(
          new Array(MAX_PARTITIONS + 1).fill(partitions(1, 10)[0]),
        ),
    ).toThrow(InvalidParameters);
  });
});
