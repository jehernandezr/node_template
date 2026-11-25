import type { TenantPlacement } from '../model/tenant-placement.js';

/**
 * Source of truth for tenant placements and for the instances of the
 * logical shards (the catalog). Read side: `ShardRouter` queries it on
 * every cache miss. The Postgres implementation belongs to
 * `@platform/adapters-postgres`; `InMemoryDirectoryStore`, from `@platform/sharding/test-utils`, covers tests.
 */
export abstract class DirectoryStore {
  /** Placement of a tenant in lowercase, or `undefined` if the tenant does not exist. */
  abstract getPlacement(tenantId: string): Promise<TenantPlacement | undefined>;

  /** Physical instance of a logical shard, or `undefined` if the shard does not exist. */
  abstract getInstance(logicalShard: string): Promise<string | undefined>;
}
