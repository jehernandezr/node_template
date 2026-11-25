import type { Clock } from '@platform/kernel';
import type { Region } from '../model/region.js';
import type { ShardingStrategy } from '../sharding-strategy.js';
import type { DirectoryStore } from '../ports/directory-store.js';
import type { RoutingCache } from '../ports/routing-cache.js';
import type { ShardDirectoryChangePublisher } from '../ports/shard-directory-change-publisher.js';

/** Options of `ShardRouter`. */
export interface ShardRouterOptions {
  readonly directory: DirectoryStore;
  /** Cache shared across processes. Optional. Its failures fall back to the directory. */
  readonly sharedCache?: RoutingCache;
  /** In-process TTL of placements and instances. Defaults to 60 s. A placement never outlives its shared entry. */
  readonly localTtlMs?: number;
  /** TTL of placements written to the shared cache. Defaults to 300 s. */
  readonly sharedTtlMs?: number;
  /**
   * TTL of the tombstone `invalidate` leaves in the shared cache. Defaults to
   * 30 s. A placement load that takes that long or longer is not written to the shared
   * cache, so no overlapping invalidation can be undone.
   */
  readonly tombstoneTtlMs?: number;
  /** Time source. */
  readonly clock: Clock;
  /** Picks the shard within a group with more than one. Defaults to consistent hashing. */
  readonly strategy?: ShardingStrategy;
  /** Region this process serves. Placements from other regions throw `WrongRegionError`. */
  readonly currentRegion?: string;
  /** Known regions: they give `WrongRegionError` the URL of the tenant region. */
  readonly regions?: readonly Region[];
  /**
   * Receives shared cache and change channel failures, and
   * malformed changes. A cache or channel that is down never makes a `resolve` or an `invalidate` fail.
   */
  readonly onCacheError?: (error: unknown) => void;
  /**
   * Channel to the other processes of the service. With it, `invalidate` publishes
   * `ShardingEvent.ShardDirectoryChanged` after writing the tombstone, and each
   * process that called `ShardRouter.listen` discards its in-process copy
   * immediately instead of waiting `localTtlMs`.
   */
  readonly changes?: ShardDirectoryChangePublisher;
  /**
   * Maximum number of tenants in the in-process placement cache, and of
   * tracked invalidations and in-flight loads. The least recent one is evicted
   * first. Defaults to 10 000.
   */
  readonly maxPlacements?: number;
  /** Maximum number of logical shards in the in-process instance cache. Defaults to 10 000. */
  readonly maxInstances?: number;
  /** Maximum length of the routing key (`keyValue`), in UTF-16 units. Defaults to 256. */
  readonly maxKeyLength?: number;
  /**
   * Format tenant ids must match, without the `g` or `y` flags.
   * Defaults to `TenantId.DEFAULT_PATTERN`. Ids longer than
   * `TenantId.MAX_LENGTH` are rejected whatever the pattern.
   */
  readonly tenantIdPattern?: RegExp;
}
