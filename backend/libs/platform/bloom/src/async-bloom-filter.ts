import { BloomFilter } from './bloom-filter.js';

/** Port for bloom filters held by remote backends (for example Valkey). */
export interface AsyncBloomFilter {
  /** Inserts one item. */
  add(item: string): Promise<void>;
  /** Inserts several items. */
  addMany(items: readonly string[]): Promise<void>;
  /** Resolves false when the item is definitely absent, true when it may be present. */
  mightContain(item: string): Promise<boolean>;
}

/** Batches of items read from a filter's source of truth, for a rebuild. */
export type BloomRebuildSource =
  AsyncIterable<readonly string[]> | Iterable<readonly string[]>;

/** A filter that its scheduled job can rebuild from the source of truth. */
export interface RebuildableBloomFilter extends AsyncBloomFilter {
  /**
   * Builds a fresh filter from `source` and swaps it in at once. Readers keep the old filter until the swap,
   * so they never see a half-built one. If `source` fails, the old filter stays and the error propagates.
   */
  rebuild(source: BloomRebuildSource): Promise<void>;
}

/** {@link AsyncBloomFilter} backed by a local {@link BloomFilter}. */
export class InMemoryAsyncBloomFilter implements RebuildableBloomFilter {
  private filter: BloomFilter;

  constructor(filter: BloomFilter) {
    this.filter = filter;
  }

  async add(item: string): Promise<void> {
    this.filter.add(item);
  }

  async addMany(items: readonly string[]): Promise<void> {
    for (const item of items) {
      this.filter.add(item);
    }
  }

  async mightContain(item: string): Promise<boolean> {
    return this.filter.mightContain(item);
  }

  /** Rebuilds with the same size and hash count. */
  async rebuild(source: BloomRebuildSource): Promise<void> {
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
