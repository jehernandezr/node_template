import { BloomFilter } from './bloom-filter.js';
import type { BloomRebuildSource } from './bloom-rebuild-source.js';
import { RebuildableBloomFilter } from './rebuildable-bloom-filter.js';

/** `AsyncBloomFilter` backed by a local `BloomFilter`. */
export class InMemoryAsyncBloomFilter extends RebuildableBloomFilter {
  private filter: BloomFilter;

  constructor(filter: BloomFilter) {
    super();
    this.filter = filter;
  }

  override async add(item: string): Promise<void> {
    this.filter.add(item);
  }

  override async addMany(items: readonly string[]): Promise<void> {
    for (const item of items) {
      this.filter.add(item);
    }
  }

  override async mightContain(item: string): Promise<boolean> {
    return this.filter.mightContain(item);
  }

  /** Rebuilds with the same size and number of hash functions. */
  override async rebuild(source: BloomRebuildSource): Promise<void> {
    const fresh = new BloomFilter({
      bits: this.filter.bits,
      hashes: this.filter.hashes,
    });
    for await (const batch of source) {
      for (const item of batch) {
        fresh.add(item);
      }
    }
    this.filter = fresh;
  }
}
