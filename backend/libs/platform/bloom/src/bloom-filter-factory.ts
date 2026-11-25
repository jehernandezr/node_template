import type { ResolvedBloomFilterDefinition } from './bloom-filter-definition.js';
import type { RebuildableBloomFilter } from './rebuildable-bloom-filter.js';

/** Creates the empty filter for a definition. Each backend provides its factory. */
export abstract class BloomFilterFactory {
  abstract create(
    definition: ResolvedBloomFilterDefinition,
  ): RebuildableBloomFilter;
}
