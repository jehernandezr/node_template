import { BloomFilterFactory } from '../../../bloom-filter-factory.js';
import type { ResolvedBloomFilterDefinition } from '../../../bloom-filter-definition.js';
import { InMemoryBloomFilterFactory } from '../../../in-memory-bloom-filter-factory.js';
import type { RebuildableBloomFilter } from '../../../rebuildable-bloom-filter.js';

/** Fábrica de prueba que cuenta los filtros creados y delega en la de memoria. */
export class CountingBloomFilterFactory extends BloomFilterFactory {
  created = 0;
  private readonly delegate = new InMemoryBloomFilterFactory();

  create(definition: ResolvedBloomFilterDefinition): RebuildableBloomFilter {
    this.created += 1;
    return this.delegate.create(definition);
  }
}
