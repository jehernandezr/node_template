import { BloomFilter } from './bloom-filter.js';
import { BloomFilterFactory } from './bloom-filter-factory.js';
import type { ResolvedBloomFilterDefinition } from './bloom-filter-definition.js';
import { InMemoryAsyncBloomFilter } from './in-memory-async-bloom-filter.js';
import type { RebuildableBloomFilter } from './rebuildable-bloom-filter.js';

/** Fábrica de filtros en memoria del proceso. */
export class InMemoryBloomFilterFactory extends BloomFilterFactory {
  create(definition: ResolvedBloomFilterDefinition): RebuildableBloomFilter {
    return new InMemoryAsyncBloomFilter(
      BloomFilter.create({
        expectedItems: definition.expectedItems,
        falsePositiveRate: definition.falsePositiveRate,
      }),
    );
  }
}
