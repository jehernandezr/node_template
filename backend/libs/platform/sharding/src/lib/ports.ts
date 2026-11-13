import type { TenantPlacement } from './types.js';

/**
 * Source of truth for tenant placements and logical shard instances (the catalog). Read side, used by
 * `ShardRouter` on every cache miss. The Postgres implementation over the `catalog` database belongs to
 * `@platform/persistence`; `InMemoryDirectoryStore` covers tests and local setups.
 */
export interface DirectoryStore {
  /** Placement of a lowercase tenant id, or undefined when the tenant is unknown. */
  getPlacement(tenantId: string): Promise<TenantPlacement | undefined>;
  /** Physical instance of a logical shard, or undefined when the shard is unknown. */
  getInstance(logicalShard: string): Promise<string | undefined>;
}

/** Outcome of a conditional write to the directory. */
export enum DirectoryWriteResult {
  Written = 'written',
  /** The stored version is not the one the caller read (or the tenant already exists): reread and retry. */
  VersionConflict = 'version-conflict',
  /**
   * The placement breaks shard exclusivity: a dedicated tenant would share a shard, or a tenant would land on
   * a shard that a dedicated tenant owns. Run the placement policy again with fresh data.
   */
  ShardTaken = 'shard-taken',
}

/**
 * Write side of the directory, used by the onboarding and move sagas. Every write is conditional, so two
 * concurrent sagas never both win:
 *
 * - `putPlacement` is a compare-and-set on `version`. Creating a tenant (`expectedVersion` undefined)
 *   succeeds only when the tenant has no row; updating succeeds only when the stored version equals
 *   `expectedVersion`, and the new placement must carry `expectedVersion + 1`.
 * - Shard exclusivity is checked in the same atomic step as the write. In Postgres: one transaction that
 *   locks the rows of the target shards (`SELECT ... FOR UPDATE` on the shard table) before counting their
 *   tenants, or an exclusion constraint. A pure policy such as `LeastLoadedPlacementPolicy` cannot see a
 *   concurrent placement; this check is what stops two dedicated tenants from taking the same empty shard.
 *
 * After a successful update the writer calls `ShardRouter.invalidate(tenantId, { version })`, which also
 * publishes `ShardingEvent.ShardDirectoryChanged` when the router has a publisher.
 */
export interface DirectoryWriter {
  /** Placements of a region, the input of a `ShardPlacementPolicy`. */
  listPlacements(region: string): Promise<readonly TenantPlacement[]>;
  /**
   * @param placement New placement. Its version is 1 for a new tenant, `expectedVersion + 1` otherwise.
   * @param expectedVersion Version the caller read, or undefined to create the tenant.
   */
  putPlacement(
    placement: TenantPlacement,
    expectedVersion: number | undefined,
  ): Promise<DirectoryWriteResult>;
}

/** Shared cache used across processes (for example Valkey). Values are JSON strings. */
export interface RoutingCache {
  get(key: string): Promise<string | undefined>;
  /**
   * Writes only when the key is absent, expired or the stored version is lower; equal versions are refused.
   * Must be atomic: `ShardRouter` relies on it to keep a tombstone from being overwritten by an older placement.
   * Resolves true when written.
   */
  setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean>;
  /** Removes the key. `ShardRouter` does not call it: invalidations write a versioned tombstone instead. */
  delete(key: string): Promise<void>;
}
