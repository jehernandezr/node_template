import { BloomMath } from '../bloom-math.js';
import { BloomSizing } from '../bloom-sizing.js';
import { BloomErrorCode } from '../errors/bloom-error-code.enum.js';
import { PartitionedBloomFilter } from '../partitioned-bloom-filter.js';
import { BloomFixtures } from './utils/bloom-fixtures.js';
import { FakeRebuildSourceProvider } from './utils/fake-rebuild-source-provider.js';
import { NonRebuildableBloomFilter } from './utils/non-rebuildable-bloom-filter.js';

describe('PartitionedBloomFilter', () => {
  it('finds every added item, with no false negatives', async () => {
    const filter = new PartitionedBloomFilter(
      BloomFixtures.inMemoryPartitions(4, 1_000),
    );
    const items = BloomFixtures.items('hash', 2_000);
    await filter.addMany(items.slice(0, 1_000));
    await filter.addMany(items.slice(1_000, 1_010));

    await expect(
      BloomFixtures.countPositive(filter, items.slice(0, 1_010)),
    ).resolves.toBe(1_010);
    expect(filter.size).toBe(4);
  });

  it('stores each item in exactly the partition that partitionOf names', async () => {
    const parts = BloomFixtures.inMemoryPartitions(3, 100);
    const filter = new PartitionedBloomFilter(parts);
    const item = 'only-here';
    await filter.add(item);
    const index = BloomMath.partitionOf(item, 3);

    const found = await Promise.all(
      parts.map((part) => part.mightContain(item)),
    );
    expect(found).toEqual(parts.map((_part, i) => i === index));
  });

  it('spreads items evenly over the partitions', () => {
    const counts = BloomFixtures.partitionCounts(
      BloomFixtures.items('item', 40_000),
      4,
    );
    expect(counts.every((count) => count > 9_000 && count < 11_000)).toBe(true);
  });

  it('keeps the false positive rate of one partition', async () => {
    const filter = new PartitionedBloomFilter(
      BloomFixtures.inMemoryPartitions(4, 2_500),
    );
    await filter.addMany(BloomFixtures.items('member', 10_000));

    const positives = await BloomFixtures.countPositive(
      filter,
      BloomFixtures.items('absent', 10_000),
    );
    expect(positives / 10_000).toBeLessThan(0.02);
  });

  it('rejects an empty or oversized partition list', () => {
    expect(() => new PartitionedBloomFilter([])).toThrow(
      expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
    );
    expect(
      () =>
        new PartitionedBloomFilter(
          BloomFixtures.inMemoryPartitions(BloomSizing.MAX_PARTITIONS + 1, 10),
        ),
    ).toThrow(
      expect.objectContaining({ code: BloomErrorCode.InvalidParameters }),
    );
  });

  it('rebuilds every partition, reading the source once per partition', async () => {
    const parts = BloomFixtures.inMemoryPartitions(3, 1_000);
    const filter = new PartitionedBloomFilter(parts);
    await filter.add('removed-long-ago');
    const source = new FakeRebuildSourceProvider([
      ['fresh-1', 'fresh-2', 'fresh-3', 'fresh-4'],
    ]);

    await filter.rebuildFrom(() => source.batches());

    await expect(
      BloomFixtures.countPositive(filter, [
        'fresh-1',
        'fresh-2',
        'fresh-3',
        'fresh-4',
      ]),
    ).resolves.toBe(4);
    await expect(filter.mightContain('removed-long-ago')).resolves.toBe(false);
    expect(source.calls).toBe(3);
  });

  it('keeps the old items when the source fails before the first batch', async () => {
    const filter = new PartitionedBloomFilter(
      BloomFixtures.inMemoryPartitions(2, 1_000),
    );
    await filter.add('still-here');
    const source = new FakeRebuildSourceProvider([], new Error('source down'));

    await expect(filter.rebuildFrom(() => source.batches())).rejects.toThrow(
      'source down',
    );
    await expect(filter.mightContain('still-here')).resolves.toBe(true);
  });

  it('refuses to rebuild when a partition cannot be rebuilt, without touching any', async () => {
    const rebuildable = BloomFixtures.inMemoryPartitions(1, 1_000)[0];
    const filter = new PartitionedBloomFilter([
      rebuildable,
      new NonRebuildableBloomFilter(),
    ]);
    await filter.add('still-here');

    await expect(
      filter.rebuildFrom(() => new FakeRebuildSourceProvider().batches()),
    ).rejects.toMatchObject({ code: BloomErrorCode.InvalidParameters });
    await expect(filter.mightContain('still-here')).resolves.toBe(true);
  });
});
