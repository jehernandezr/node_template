import { BloomFilter } from './bloom-filter.js';
import { BloomFilterFactory } from './bloom-filter-factory.js';
import type { ResolvedBloomFilterDefinition } from './bloom-filter-definition.js';
import { InMemoryAsyncBloomFilter } from './in-memory-async-bloom-filter.js';
import type { RebuildableBloomFilter } from './rebuildable-bloom-filter.js';

/** Factory of in-process memory filters. */
export class InMemoryBloomFilterFactory extends BloomFilterFactory {
  override create(
    definition: ResolvedBloomFilterDefinition,
  ): RebuildableBloomFilter {
    return new InMemoryAsyncBloomFilter(
      BloomFilter.create({
        expectedItems: definition.expectedItems,
        falsePositiveRate: definition.falsePositiveRate,
      }),
    );
  }
}
