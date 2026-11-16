import { BloomFilterAssembler } from '../bloom-filter-assembler.js';
import { BloomDefinitionResolver } from '../bloom-definition-resolver.js';
import { InMemoryBloomFilterFactory } from '../in-memory-bloom-filter-factory.js';
import { InMemoryAsyncBloomFilter } from '../in-memory-async-bloom-filter.js';
import { PartitionedBloomFilter } from '../partitioned-bloom-filter.js';

const definition = BloomDefinitionResolver.resolve({
  name: 'users.emails',
  expectedItems: 10_000,
  rebuildCron: '0 3 * * *',
});

describe('BloomFilterAssembler', () => {
  it('builds one filter when it fits in one partition', () => {
    const filter = new BloomFilterAssembler(
      new InMemoryBloomFilterFactory(),
    ).assemble(definition);
    expect(filter).toBeInstanceOf(InMemoryAsyncBloomFilter);
  });

  it('builds a partitioned filter with the partitions the budget needs', () => {
    const filter = new BloomFilterAssembler(
      new InMemoryBloomFilterFactory(),
      1_024,
    ).assemble(definition);
    expect(filter).toBeInstanceOf(PartitionedBloomFilter);
    expect(filter).toMatchObject({ size: 94 });
  });
});
