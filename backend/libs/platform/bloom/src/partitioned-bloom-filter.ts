import { AsyncBloomFilter } from './async-bloom-filter.js';
import { BloomMath } from './bloom-math.js';
import type {
  BloomRebuildSource,
  BloomRebuildSourceFactory,
} from './bloom-rebuild-source.js';
import { BloomSizing } from './bloom-sizing.js';
import { InvalidParametersError } from './errors/invalid-parameters.error.js';
import { RebuildableBloomFilter } from './rebuildable-bloom-filter.js';

/**
 * A logical filter split into several filters by a hash of the item. Each item lives in a single
 * partition, so the false positive rate of the whole is that of each partition. Useful when a
 * set does not fit in a single filter: the Have I Been Pwned list does not fit in a 2^32-bit filter at
 * 1 %, and Valkey's `BF.*` module limits each filter's memory (`bf.bloom-memory-usage-limit`, 128 MiB
 * by default).
 *
 * Sizes each partition for `expectedItems / partitions` items. Rebuilds each partition separately,
 * giving it only the items for which `BloomMath.partitionOf` returns its index.
 */
export class PartitionedBloomFilter extends AsyncBloomFilter {
  private readonly partitions: readonly AsyncBloomFilter[];

  /** @throws InvalidParametersError with no partitions or with more than `BloomSizing.MAX_PARTITIONS`. */
  constructor(partitions: readonly AsyncBloomFilter[]) {
    super();
    if (
      partitions.length === 0 ||
      partitions.length > BloomSizing.MAX_PARTITIONS
    ) {
      throw new InvalidParametersError(
        `partitions must have between 1 and ${BloomSizing.MAX_PARTITIONS} filters, got ${partitions.length}`,
      );
    }
    this.partitions = [...partitions];
  }

  /** Number of partitions. */
  get size(): number {
    return this.partitions.length;
  }

  override add(item: string): Promise<void> {
    return this.partitionFor(item).add(item);
  }

  override async addMany(items: readonly string[]): Promise<void> {
    const batches = new Map<number, string[]>();
    for (const item of items) {
      const index = BloomMath.partitionOf(item, this.partitions.length);
      const batch = batches.get(index);
      if (batch === undefined) {
        batches.set(index, [item]);
      } else {
        batch.push(item);
      }
    }
    await Promise.all(
      [...batches].map(([index, batch]) =>
        this.partitions[index].addMany(batch),
      ),
    );
  }

  override mightContain(item: string): Promise<boolean> {
    return this.partitionFor(item).mightContain(item);
  }

  /**
   * Rebuilds each partition from a new source. First checks that all of them can be rebuilt and, if
   * not, throws `InvalidParametersError` without touching any. Then, in sequence, each partition reads the source
   * from the start and keeps only its items, so the whole set is never held in memory.
   */
  async rebuildFrom(factory: BloomRebuildSourceFactory): Promise<void> {
    const rebuildable = this.partitions.filter(RebuildableBloomFilter.is);
    if (rebuildable.length !== this.partitions.length) {
      throw new InvalidParametersError(
        'every partition must be rebuildable to rebuild the filter',
      );
    }
    for (let index = 0; index < rebuildable.length; index += 1) {
      await rebuildable[index].rebuild(this.itemsOf(factory, index));
    }
  }

  private partitionFor(item: string): AsyncBloomFilter {
    return this.partitions[BloomMath.partitionOf(item, this.partitions.length)];
  }

  /** Returns the source batches that belong to partition `index`. Empty batches are not yielded. */
  private async *itemsOf(
    factory: BloomRebuildSourceFactory,
    index: number,
  ): AsyncGenerator<readonly string[]> {
    const source: BloomRebuildSource = factory();
    for await (const batch of source) {
      const own = batch.filter(
        (item) => BloomMath.partitionOf(item, this.partitions.length) === index,
      );
      if (own.length > 0) {
        yield own;
      }
    }
  }
}
