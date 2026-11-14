import type { AsyncBloomFilter } from './async-bloom-filter.js';
import type { BloomFilter } from './bloom-filter.js';
import { DuplicateFilter, UnknownFilter } from './bloom-error.js';
import {
  resolveBloomFilterDefinition,
  type BloomFilterDefinition,
  type ResolvedBloomFilterDefinition,
} from './bloom-filter-definition.js';

interface Entry<TName extends string, TFilter> {
  readonly definition: ResolvedBloomFilterDefinition<TName>;
  readonly filter: TFilter;
}

/**
 * Named filters with their declarations. Names come from a caller-provided string enum so typos fail at
 * compile time. The rebuild job of each filter is scheduled from {@link BloomFilterRegistry.definitions}.
 * @typeParam TName caller-provided enum of filter names.
 * @typeParam TFilter filter type stored under each name.
 */
export class BloomFilterRegistry<
  TName extends string,
  TFilter extends BloomFilter | AsyncBloomFilter = BloomFilter,
> {
  private readonly entries = new Map<TName, Entry<TName, TFilter>>();

  /**
   * @throws {DuplicateFilter} when the name is already registered.
   * @throws {InvalidParameters} when the definition is invalid.
   */
  register(definition: BloomFilterDefinition<TName>, filter: TFilter): void {
    const resolved = resolveBloomFilterDefinition(definition);
    if (this.entries.has(resolved.name)) {
      throw new DuplicateFilter(resolved.name);
    }
    this.entries.set(resolved.name, { definition: resolved, filter });
  }

  /**
   * @throws {UnknownFilter} when `name` was never registered.
   */
  get(name: TName): TFilter {
    return this.entry(name).filter;
  }

  /**
   * Declaration of a filter, with its defaults applied.
   * @throws {UnknownFilter} when `name` was never registered.
   */
  definition(name: TName): ResolvedBloomFilterDefinition<TName> {
    return this.entry(name).definition;
  }

  /** Every declaration, in registration order. */
  definitions(): readonly ResolvedBloomFilterDefinition<TName>[] {
    return [...this.entries.values()].map((entry) => entry.definition);
  }

  private entry(name: TName): Entry<TName, TFilter> {
    const entry = this.entries.get(name);
    if (entry === undefined) {
      throw new UnknownFilter(name);
    }
    return entry;
  }
}
