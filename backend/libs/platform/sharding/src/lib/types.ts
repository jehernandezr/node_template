/** Key that selects the logical shard inside a tenant's shard group. */
export enum ShardKey {
  Tenant = 'tenant',
  User = 'user',
  Custom = 'custom',
}

/**
 * Declarative routing strategy of a module, as in
 * `PersistenceModule.forFeature({ sharding: { strategy: ShardStrategy.Directory, key: ShardKey.User } })`.
 */
export enum ShardStrategy {
  /**
   * Default. The catalog directory maps tenant → region → shard group; a group with more than one shard is
   * split by consistent hashing on the routing key (`ConsistentHashStrategy`). Lets tenants move.
   */
  Directory = 'directory',
  /** Ring with virtual nodes over the group (`ConsistentHashStrategy`). Many small keys. */
  ConsistentHash = 'consistent-hash',
  /** Sorted key ranges (`RangeShardStrategy`). Keys with a natural order, such as dates. */
  Range = 'range',
}

/**
 * Produces the routing key of a module that shards by its own key (`ShardKey.Custom`), for example an
 * account id or a business region.
 * @typeParam TSource what the persistence layer hands over: the entity, the criteria or the request.
 */
export interface ShardKeyResolver<TSource = unknown> {
  /** @returns the routing key, or undefined when the source does not carry one (the query stops). */
  resolve(source: TSource): string | undefined;
}

/** Sharding declaration of a module. `keyResolver` is required with `ShardKey.Custom` and refused otherwise. */
export interface ShardingFeatureOptions<TSource = unknown> {
  readonly strategy: ShardStrategy;
  readonly key: ShardKey;
  readonly keyResolver?: ShardKeyResolver<TSource>;
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
