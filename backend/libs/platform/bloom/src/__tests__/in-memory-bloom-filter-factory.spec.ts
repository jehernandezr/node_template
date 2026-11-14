import { BloomDefinitionResolver } from '../bloom-definition-resolver.js';
import { InMemoryBloomFilterFactory } from '../in-memory-bloom-filter-factory.js';
import { InMemoryAsyncBloomFilter } from '../in-memory-async-bloom-filter.js';

describe('InMemoryBloomFilterFactory', () => {
  it('creates an empty rebuildable in-memory filter for the definition', async () => {
    const definition = BloomDefinitionResolver.resolve({
      name: 'users.emails',
      expectedItems: 500,
      rebuildCron: '0 3 * * *',
    });
    const filter = new InMemoryBloomFilterFactory().create(definition);

    expect(filter).toBeInstanceOf(InMemoryAsyncBloomFilter);
    await expect(filter.mightContain('anything')).resolves.toBe(false);
  });
});
