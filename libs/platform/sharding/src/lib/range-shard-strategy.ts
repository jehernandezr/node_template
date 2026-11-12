import { ShardingError, ShardingErrorCode } from './errors.js';
import type { ShardingStrategy } from './sharding-strategy.js';

/** Upper bound (inclusive) of a key range and the shard that serves it. */
export interface RangeBoundary {
  readonly upTo: string;
  readonly shard: string;
}

/** Total order over keys. Default compares UTF-16 code units. */
export type KeyComparator = (a: string, b: string) => number;

const compareCodeUnits: KeyComparator = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Maps keys to shards by sorted ranges.
 * A key goes to the first boundary with `key <= upTo`; keys above every boundary go to the last shard.
 */
export class RangeShardStrategy implements ShardingStrategy {
  private readonly boundaries: readonly RangeBoundary[];
  private readonly lastShard: string;
  private readonly compare: KeyComparator;

  /**
   * @param compare Order used for boundaries and keys, for example a numeric comparator for numeric keys.
   * @throws Error when the configuration is invalid (empty shard ids or duplicate boundaries).
   */
  constructor(
    boundaries: readonly RangeBoundary[],
    lastShard: string,
    compare: KeyComparator = compareCodeUnits,
  ) {
    if (lastShard.length === 0) {
      throw new Error('lastShard must be a non-empty shard id');
    }
    for (const boundary of boundaries) {
      if (boundary.shard.length === 0) {
        throw new Error(`Boundary "${boundary.upTo}" has an empty shard id`);
      }
    }
    const sorted = [...boundaries].sort((a, b) => compare(a.upTo, b.upTo));
    for (let i = 1; i < sorted.length; i++) {
      if (compare(sorted[i - 1].upTo, sorted[i].upTo) === 0) {
        throw new Error(`Duplicate range boundary "${sorted[i].upTo}"`);
      }
    }
    this.boundaries = sorted;
    this.lastShard = lastShard;
    this.compare = compare;
  }

  /** @throws ShardingError `UnknownShard` when the range shard is not part of the group. */
  locate(key: string, group: readonly string[]): string {
    const shard =
      this.boundaries.find((boundary) => this.compare(key, boundary.upTo) <= 0)
        ?.shard ?? this.lastShard;
    if (!group.includes(shard)) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        `Shard "${shard}" is not in the tenant's group`,
      );
    }
    return shard;
  }
}
