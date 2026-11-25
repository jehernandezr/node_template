import { ConsistentHashRing } from './consistent-hash-ring.js';
import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';
import { LruMap } from './lru-map.js';
import { ShardStrategy } from './model/shard-strategy.enum.js';

/** Picks the logical shard of a key within a tenant's shard group. */
export interface ShardingStrategy {
  /** Declarative name of a built-in strategy. Custom strategies do not declare it. */
  readonly kind?: ShardStrategy;
  /**
   * @param key Normalized routing key.
   * @param group Tenant shard group, non-empty.
   * @param version Placement version. A strategy whose result depends on more than the group
   *   (for example ranges stored per placement) can key its derived state by it; the built-in ones ignore it.
   * @throws ShardingError `UnknownShard` when no shard can serve the key.
   */
  locate(key: string, group: readonly string[], version?: number): string;
}

/** Options of {@link ConsistentHashStrategy}. */
export interface ConsistentHashStrategyOptions {
  /** Maximum number of memoized rings (one per distinct group); the least recently used is discarded. Defaults to 1 024. */
  readonly maxRings?: number;
}

/**
 * Consistent hashing over the group. Rings are memoized by the sorted group (JSON of the group), at most
 * `maxRings`. The ring depends only on the group members, so tenants that share a group share
 * a ring regardless of their placement versions; a group change (a new member) builds a new ring.
 */
export class ConsistentHashStrategy implements ShardingStrategy {
  readonly kind = ShardStrategy.ConsistentHash;
  private readonly rings: LruMap<string, ConsistentHashRing>;

  /** @throws ShardingError `InvalidConfiguration` when `maxRings` is not a positive integer. */
  constructor(options: ConsistentHashStrategyOptions = {}) {
    this.rings = new LruMap(options.maxRings ?? 1_024);
  }

  locate(key: string, group: readonly string[]): string {
    if (group.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'Shard group is empty',
      );
    }
    const shard = this.ringFor(group).locate(key);
    if (shard === undefined) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'No shard found for key',
      );
    }
    return shard;
  }

  private ringFor(group: readonly string[]): ConsistentHashRing {
    const memoKey = JSON.stringify([...group].sort());
    const memo = this.rings.get(memoKey);
    if (memo !== undefined) {
      return memo;
    }
    const ring = new ConsistentHashRing();
    for (const shard of group) {
      ring.add(shard);
    }
    this.rings.set(memoKey, ring);
    return ring;
  }
}
