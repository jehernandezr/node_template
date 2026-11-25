/** Stable error codes of `@platform/sharding`. */
export enum ShardingErrorCode {
  KeyMissing = 'PLATFORM.SHARDING.KEY_MISSING',
  CrossShardTransaction = 'PLATFORM.SHARDING.CROSS_SHARD_TX',
  TenantMigrating = 'PLATFORM.SHARDING.TENANT_MIGRATING',
  TenantNotWritable = 'PLATFORM.SHARDING.TENANT_NOT_WRITABLE',
  UnknownTenant = 'PLATFORM.SHARDING.UNKNOWN_TENANT',
  UnknownShard = 'PLATFORM.SHARDING.UNKNOWN_SHARD',
  WrongRegion = 'PLATFORM.SHARDING.WRONG_REGION',
  /** The tenant id is not a UUIDv7 (or does not match the configured format). */
  InvalidTenantId = 'PLATFORM.SHARDING.INVALID_TENANT_ID',
  /** The routing key exceeds the configured maximum. */
  InvalidKey = 'PLATFORM.SHARDING.INVALID_KEY',
  /** A constructor or method received an invalid option. This is a programming error. */
  InvalidConfiguration = 'PLATFORM.SHARDING.INVALID_CONFIG',
}
