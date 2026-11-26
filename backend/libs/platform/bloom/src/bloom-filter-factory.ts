import type { ResolvedBloomFilterDefinition } from './bloom-filter-definition.js';
import type { RebuildableBloomFilter } from './rebuildable-bloom-filter.js';

/** Creates the empty filter for a definition. Each backend provides its factory. */
export abstract class BloomFilterFactory {
  /**
   * Creates one rebuildable filter partition of the adapter in use.
   * @param definition Resolved definition.
   * @returns The filter.
   */
  abstract create(
    definition: ResolvedBloomFilterDefinition,
  ): RebuildableBloomFilter;
}
