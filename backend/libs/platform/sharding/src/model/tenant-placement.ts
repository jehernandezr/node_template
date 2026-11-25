import type { TenantStatus } from './tenant-status.enum.js';

/** Where a tenant lives: its region and the logical shards assigned to it. */
export interface TenantPlacement {
  readonly tenantId: string;
  readonly region: string;
  /**
   * Non-empty list of logical shards. Adding a shard to a group is only
   * valid with a move saga and the tenant in `Migrating`, so that
   * writes stay blocked while the group changes.
   */
  readonly shardGroup: readonly string[];
  readonly status: TenantStatus;
  /** Increases with each placement change. Caches keep the highest version. */
  readonly version: number;
  /** `true` when the tenant is the exclusive owner of its shard. */
  readonly dedicated: boolean;
}
