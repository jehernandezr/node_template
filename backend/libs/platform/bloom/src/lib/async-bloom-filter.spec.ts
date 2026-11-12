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
