import type { AsyncBloomFilter } from './async-bloom-filter.js';
import type { ResolvedBloomFilterDefinition } from './bloom-filter-definition.js';
import type { BloomFilterFactory } from './bloom-filter-factory.js';
import { BloomSizing } from './bloom-sizing.js';
import { PartitionedBloomFilter } from './partitioned-bloom-filter.js';

/**
 * Builds the filter for a definition: a single one when it fits in `maxBitsPerPartition`, or a
 * `PartitionedBloomFilter` with the needed partitions.
 */
export class BloomFilterAssembler {
  constructor(
    private readonly factory: BloomFilterFactory,
    private readonly maxBitsPerPartition: number = BloomSizing.MAX_BITS,
  ) {}

  assemble(definition: ResolvedBloomFilterDefinition): AsyncBloomFilter {
    const count = BloomSizing.partitionCount(
      definition.expectedItems,
      definition.falsePositiveRate,
      this.maxBitsPerPartition,
    );
    if (count === 1) {
      return this.factory.create(definition);
    }
    const partitions = Array.from({ length: count }, (_, index) =>
      this.factory.create({
        ...definition,
        name: `${definition.name}.${index}`,
        expectedItems: Math.ceil(definition.expectedItems / count),
      }),
    );
    return new PartitionedBloomFilter(partitions);
  }
}
