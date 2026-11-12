import type { BloomFilter } from './bloom-filter.js';

/** Port for bloom filters held by remote backends (for example Valkey). */
export interface AsyncBloomFilter {
  /** Inserts one item. */
  add(item: string): Promise<void>;
  /** Inserts several items. */
  addMany(items: readonly string[]): Promise<void>;
  /** Resolves false when the item is definitely absent, true when it may be present. */
  mightContain(item: string): Promise<boolean>;
}

/** {@link AsyncBloomFilter} backed by a local {@link BloomFilter}. */
export class InMemoryAsyncBloomFilter implements AsyncBloomFilter {
  private readonly filter: BloomFilter;

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
}
