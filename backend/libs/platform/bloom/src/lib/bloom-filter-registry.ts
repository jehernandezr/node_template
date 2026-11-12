import type { AsyncBloomFilter } from './async-bloom-filter.js';
import type { BloomFilter } from './bloom-filter.js';
import { DuplicateFilter, UnknownFilter } from './bloom-error.js';

/**
 * Named filters. Names come from a caller-provided string enum so typos fail at compile time.
 * @typeParam TName caller-provided enum of filter names.
 * @typeParam TFilter filter type stored under each name.
 */
export class BloomFilterRegistry<
  TName extends string,
  TFilter extends BloomFilter | AsyncBloomFilter = BloomFilter,
> {
  private readonly filters = new Map<TName, TFilter>();

  /**
   * @throws {DuplicateFilter} when `name` is already registered.
   */
  register(name: TName, filter: TFilter): void {
    if (this.filters.has(name)) {
      throw new DuplicateFilter(name);
    }
    this.filters.set(name, filter);
  }

  /**
   * @throws {UnknownFilter} when `name` was never registered.
   */
  get(name: TName): TFilter {
    const filter = this.filters.get(name);
    if (filter === undefined) {
      throw new UnknownFilter(name);
    }
    return filter;
  }
}
