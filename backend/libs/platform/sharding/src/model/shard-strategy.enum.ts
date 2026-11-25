/**
 * Declarative routing strategy of a module, as in
 * `PersistenceModule.forFeature({ sharding: { strategy: ShardStrategy.Directory, key: ShardKey.User } })`.
 */
export enum ShardStrategy {
  /**
   * Default. The catalog directory assigns tenant, region and shard
   * group; a group with more than one shard is split by consistent hashing of the
   * routing key (`ConsistentHashStrategy`). Allows moving tenants.
   */
  Directory = 'directory',
  /** Ring with virtual nodes over the group (`ConsistentHashStrategy`). Many small keys. */
  ConsistentHash = 'consistent-hash',
  /** Ordered key ranges (`RangeShardStrategy`). Keys with a natural order, such as dates. */
  Range = 'range',
}
