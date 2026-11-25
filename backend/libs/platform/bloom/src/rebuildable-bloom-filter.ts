import { AsyncBloomFilter } from './async-bloom-filter.js';
import type { BloomRebuildSource } from './bloom-rebuild-source.js';

/** Filter that the scheduled job can rebuild from the source of truth. */
export abstract class RebuildableBloomFilter extends AsyncBloomFilter {
  /**
   * Builds a new filter from `source` and swaps it in at once. Readers keep the old filter
   * until the swap, so they never see a half-built one. If `source` fails, the old one stays and
   * the error propagates up.
   */
  abstract rebuild(source: BloomRebuildSource): Promise<void>;

  /**
   * Returns whether a filter can be rebuilt. Does not use `instanceof`: adapters implement it
   * with `implements`, so the shape of the object is what counts.
   */
  static is(filter: AsyncBloomFilter): filter is RebuildableBloomFilter {
    return (
      typeof (filter as Partial<RebuildableBloomFilter>).rebuild === 'function'
    );
  }
}
