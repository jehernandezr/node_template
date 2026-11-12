import type { TenantPlacement } from './types.js';

/** Source of truth for tenant placements and logical shard instances (the catalog). */
export interface DirectoryStore {
  getPlacement(tenantId: string): Promise<TenantPlacement | undefined>;
  getInstance(logicalShard: string): Promise<string | undefined>;
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
