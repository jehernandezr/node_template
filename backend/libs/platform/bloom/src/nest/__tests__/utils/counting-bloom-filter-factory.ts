import { BloomFilterFactory } from '../../../bloom-filter-factory.js';
import type { ResolvedBloomFilterDefinition } from '../../../bloom-filter-definition.js';
import { InMemoryBloomFilterFactory } from '../../../in-memory-bloom-filter-factory.js';
import type { RebuildableBloomFilter } from '../../../rebuildable-bloom-filter.js';

/** Test factory that counts the created filters and delegates to the in-memory one. */
export class CountingBloomFilterFactory extends BloomFilterFactory {
  created = 0;
  private readonly delegate = new InMemoryBloomFilterFactory();

  override create(
    definition: ResolvedBloomFilterDefinition,
  ): RebuildableBloomFilter {
    this.created += 1;
    return this.delegate.create(definition);
  }
}
