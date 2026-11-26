import { AsyncBloomFilter } from '../../async-bloom-filter.js';
import { BloomFilter } from '../../bloom-filter.js';

/** Async filter without `rebuild`: it cannot be rebuilt. */
export class NonRebuildableBloomFilter extends AsyncBloomFilter {
  private readonly filter = BloomFilter.create({ expectedItems: 1_000 });

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
}
