import { BloomFilter } from '../bloom-filter.js';
import { InMemoryAsyncBloomFilter } from '../in-memory-async-bloom-filter.js';
import { RebuildableBloomFilter } from '../rebuildable-bloom-filter.js';
import { BloomFixtures } from './utils/bloom-fixtures.js';
import { FakeRebuildSourceProvider } from './utils/fake-rebuild-source-provider.js';

const newFilter = (): InMemoryAsyncBloomFilter =>
  new InMemoryAsyncBloomFilter(BloomFilter.create({ expectedItems: 1_000 }));

describe('InMemoryAsyncBloomFilter', () => {
  it('finds an item after add and a batch after addMany', async () => {
    const filter = newFilter();
    await filter.add('single');
    await filter.addMany(['batch-1', 'batch-2']);

    await expect(filter.mightContain('single')).resolves.toBe(true);
    await expect(filter.mightContain('batch-2')).resolves.toBe(true);
    await expect(filter.mightContain('absent-item')).resolves.toBe(false);
  });

  it('is rebuildable', () => {
    expect(RebuildableBloomFilter.is(newFilter())).toBe(true);
  });

  it('rebuilds from a source and drops the items that are no longer there', async () => {
    const filter = newFilter();
    await filter.add('removed-long-ago');

    await filter.rebuild([['kept-1', 'kept-2']]);

    await expect(filter.mightContain('kept-1')).resolves.toBe(true);
    await expect(filter.mightContain('removed-long-ago')).resolves.toBe(false);
  });

  it('keeps the old filter when the source fails', async () => {
    const filter = newFilter();
    await filter.add('still-here');
    const failing = new FakeRebuildSourceProvider([], new Error('source down'));

    await expect(filter.rebuild(failing.batches())).rejects.toThrow(
      'source down',
    );
    await expect(filter.mightContain('still-here')).resolves.toBe(true);
  });

  it('accepts a synchronous source of batches', async () => {
    const filter = newFilter();
    await filter.rebuild(BloomFixtures.items('sync', 3).map((item) => [item]));
    await expect(filter.mightContain('sync-2')).resolves.toBe(true);
  });
});
