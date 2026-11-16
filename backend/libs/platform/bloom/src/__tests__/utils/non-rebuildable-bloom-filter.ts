import { AsyncBloomFilter } from '../../async-bloom-filter.js';
import { BloomFilter } from '../../bloom-filter.js';

/** Filtro asíncrono sin `rebuild`: no se puede reconstruir. */
export class NonRebuildableBloomFilter extends AsyncBloomFilter {
  private readonly filter = BloomFilter.create({ expectedItems: 1_000 });

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
