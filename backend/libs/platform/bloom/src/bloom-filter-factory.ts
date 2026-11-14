import type { ResolvedBloomFilterDefinition } from './bloom-filter-definition.js';
import type { RebuildableBloomFilter } from './rebuildable-bloom-filter.js';

/** Crea el filtro vacío de una definición. Cada backend aporta su fábrica. */
export abstract class BloomFilterFactory {
  abstract create(
    definition: ResolvedBloomFilterDefinition,
  ): RebuildableBloomFilter;
}
