/** Stable error codes raised by the sharding lib. */
export enum ShardingErrorCode {
  KeyMissing = 'PLATFORM.SHARDING.KEY_MISSING',
  CrossShardTransaction = 'PLATFORM.SHARDING.CROSS_SHARD_TX',
  TenantMigrating = 'PLATFORM.SHARDING.TENANT_MIGRATING',
  TenantNotWritable = 'PLATFORM.SHARDING.TENANT_NOT_WRITABLE',
  UnknownTenant = 'PLATFORM.SHARDING.UNKNOWN_TENANT',
  UnknownShard = 'PLATFORM.SHARDING.UNKNOWN_SHARD',
  WrongRegion = 'PLATFORM.SHARDING.WRONG_REGION',
}

/** Error thrown by the sharding lib, identified by a stable {@link ShardingErrorCode}. */
export class ShardingError extends Error {
  readonly code: ShardingErrorCode;

  constructor(code: ShardingErrorCode, message: string) {
    super(message);
    this.name = 'ShardingError';
    this.code = code;
  }
}

/** Raised when a tenant's placement lives in a region this process does not serve. */
export class WrongRegionError extends ShardingError {
  readonly region: string;

  constructor(region: string) {
    super(
      ShardingErrorCode.WrongRegion,
      `Tenant is placed in region "${region}"`,
    );
    this.name = 'WrongRegionError';
    this.region = region;
  }
}
