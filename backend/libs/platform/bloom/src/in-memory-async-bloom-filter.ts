import { BloomFilter } from './bloom-filter.js';
import type { BloomRebuildSource } from './bloom-rebuild-source.js';
import { RebuildableBloomFilter } from './rebuildable-bloom-filter.js';

/** `AsyncBloomFilter` respaldado por un `BloomFilter` local. */
export class InMemoryAsyncBloomFilter extends RebuildableBloomFilter {
  private filter: BloomFilter;

  constructor(filter: BloomFilter) {
    super();
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

  /** Reconstruye con el mismo tamaño y número de funciones de hash. */
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
