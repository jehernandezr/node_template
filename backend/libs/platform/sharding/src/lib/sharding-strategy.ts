import { ConsistentHashRing } from './consistent-hash-ring.js';
import { ShardingError, ShardingErrorCode } from './errors.js';
import { LruMap } from './lru-map.js';

/** Chooses the logical shard for a key inside a tenant's shard group. */
export interface ShardingStrategy {
  /**
   * @param key Normalized routing key.
   * @param group Non-empty shard group of the tenant.
   * @param version Placement version. Strategies that cache derived state rebuild it when it changes.
   * @throws ShardingError `UnknownShard` when no shard can serve the key.
   */
  locate(key: string, group: readonly string[], version?: number): string;
}

/** Options of {@link ConsistentHashStrategy}. */
export interface ConsistentHashStrategyOptions {
  /** Most memoized rings (one per distinct group); the least recently used is dropped. Default 1 024. */
  readonly maxRings?: number;
}

interface RingMemo {
  readonly version: number | undefined;
  readonly ring: ConsistentHashRing;
}

/**
 * Consistent hashing over the group. Rings are memoized by the sorted group (JSON of the group), at most
 * `maxRings` of them; a different placement version replaces the memoized ring with a freshly built one.
 */
export class ConsistentHashStrategy implements ShardingStrategy {
  private readonly rings: LruMap<string, RingMemo>;

  /** @throws ShardingError `InvalidConfiguration` when `maxRings` is not a positive integer. */
  constructor(options: ConsistentHashStrategyOptions = {}) {
    this.rings = new LruMap(options.maxRings ?? 1_024);
  }

  locate(key: string, group: readonly string[], version?: number): string {
    if (group.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'Shard group is empty',
      );
    }
    const shard = this.ringFor(group, version).locate(key);
    if (shard === undefined) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'No shard found for key',
      );
    }
    return shard;
  }

  private ringFor(
    group: readonly string[],
    version: number | undefined,
  ): ConsistentHashRing {
    const memoKey = JSON.stringify([...group].sort());
    const memo = this.rings.get(memoKey);
    if (memo !== undefined && memo.version === version) {
      return memo.ring;
    }
    const ring = new ConsistentHashRing();
    for (const shard of group) {
      ring.add(shard);
    }
    this.rings.set(memoKey, { version, ring });
    return ring;
  }
}
