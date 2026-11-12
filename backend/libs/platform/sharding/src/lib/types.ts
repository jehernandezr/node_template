/** Key that selects the logical shard inside a tenant's shard group. */
export enum ShardKey {
  Tenant = 'tenant',
  User = 'user',
  Custom = 'custom',
}

/** Lifecycle status of a tenant placement. */
export enum TenantStatus {
  Active = 'active',
  Migrating = 'migrating',
}

/** Intent of a request. Reads are always allowed; writes need an Active tenant. */
export enum ShardAccess {
  Read = 'read',
  Write = 'write',
}

/** Where a tenant lives: its region and the logical shards assigned to it. */
export interface TenantPlacement {
  readonly tenantId: string;
  readonly region: string;
  /**
   * Non-empty list of logical shard ids. Adding a shard to a group is only valid through a
   * move saga with the tenant in Migrating, so writes stay blocked while the group changes.
   */
  readonly shardGroup: readonly string[];
  readonly status: TenantStatus;
  /** Increases on every change of the placement. Caches keep the highest version. */
  readonly version: number;
  /** True when the tenant owns its shard exclusively. */
  readonly dedicated: boolean;
}

/** Result of routing a request to a physical instance. */
export interface ResolvedShard {
  readonly tenantId: string;
  readonly region: string;
  readonly logicalShard: string;
  /** Physical instance hosting the logical shard. */
  readonly instance: string;
  readonly status: TenantStatus;
}
