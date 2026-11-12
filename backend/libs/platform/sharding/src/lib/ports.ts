import type { TenantPlacement } from './types.js';

/** Source of truth for tenant placements and logical shard instances (the catalog). */
export interface DirectoryStore {
  getPlacement(tenantId: string): Promise<TenantPlacement | undefined>;
  getInstance(logicalShard: string): Promise<string | undefined>;
}

/** Shared cache used across processes (for example Valkey). Values are JSON strings. */
export interface RoutingCache {
  get(key: string): Promise<string | undefined>;
  /** Writes only when the key is absent or the stored version is lower. Resolves true when written. */
  setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean>;
  delete(key: string): Promise<void>;
}
