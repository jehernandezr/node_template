import { BloomFilter } from './bloom-filter.js';
import { InMemoryAsyncBloomFilter } from './async-bloom-filter.js';

describe('InMemoryAsyncBloomFilter', () => {
  it('adds items and answers membership asynchronously', async () => {
    const filter = new InMemoryAsyncBloomFilter(
      BloomFilter.create({ expectedItems: 100, falsePositiveRate: 0.01 }),
    );
    await filter.add('one');
    await filter.addMany(['two', 'three']);

    await expect(filter.mightContain('one')).resolves.toBe(true);
    await expect(filter.mightContain('two')).resolves.toBe(true);
    await expect(filter.mightContain('three')).resolves.toBe(true);
    await expect(filter.mightContain('four')).resolves.toBe(false);
  });
});

describe('InMemoryAsyncBloomFilter.rebuild', () => {
  it('replaces the content with the items of the source', async () => {
    const filter = new InMemoryAsyncBloomFilter(
      BloomFilter.create({ expectedItems: 100 }),
    );
    await filter.add('stale');

    async function* source(): AsyncIterable<readonly string[]> {
      yield ['fresh-1', 'fresh-2'];
      yield ['fresh-3'];
    }
    await filter.rebuild(source());

    await expect(filter.mightContain('stale')).resolves.toBe(false);
    for (const item of ['fresh-1', 'fresh-2', 'fresh-3']) {
      await expect(filter.mightContain(item)).resolves.toBe(true);
    }
  });

  it('keeps the old content when the source fails', async () => {
    const filter = new InMemoryAsyncBloomFilter(
      BloomFilter.create({ expectedItems: 100 }),
    );
    await filter.add('kept');
    async function* failing(): AsyncIterable<readonly string[]> {
      yield ['partial'];
      throw new Error('source down');
    }
    await expect(filter.rebuild(failing())).rejects.toThrow('source down');
    await expect(filter.mightContain('kept')).resolves.toBe(true);
    await expect(filter.mightContain('partial')).resolves.toBe(false);
  });
});
