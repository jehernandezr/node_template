import { PlatformError } from '@platform/kernel';
import { FailureKind } from '@platform/primitives';

/** Stable error codes raised by the sharding lib. */
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
  /** The routing key is longer than the configured maximum. */
  InvalidKey = 'PLATFORM.SHARDING.INVALID_KEY',
  /** A constructor or method received an invalid option. A programming error. */
  InvalidConfiguration = 'PLATFORM.SHARDING.INVALID_CONFIG',
}

/**
 * How each code fails. Only `TenantMigrating` is transient: the move saga ends and the same request succeeds.
 * Missing keys, cross-shard transactions and bad options are bugs in the caller, so they are protocol violations.
 */
const FAILURE_KIND: Readonly<Record<ShardingErrorCode, FailureKind>> = {
  [ShardingErrorCode.KeyMissing]: FailureKind.ProtocolViolation,
  [ShardingErrorCode.CrossShardTransaction]: FailureKind.ProtocolViolation,
  [ShardingErrorCode.TenantMigrating]: FailureKind.Transient,
  [ShardingErrorCode.TenantNotWritable]: FailureKind.Permanent,
  [ShardingErrorCode.UnknownTenant]: FailureKind.Permanent,
  [ShardingErrorCode.UnknownShard]: FailureKind.Permanent,
  [ShardingErrorCode.WrongRegion]: FailureKind.Permanent,
  [ShardingErrorCode.InvalidTenantId]: FailureKind.Permanent,
  [ShardingErrorCode.InvalidKey]: FailureKind.Permanent,
  [ShardingErrorCode.InvalidConfiguration]: FailureKind.ProtocolViolation,
};

/** Options of a {@link ShardingError}. `retryable` follows from the code. */
export interface ShardingErrorOptions {
  /** Diagnostic data. Never secrets or raw request values beyond identifiers. */
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
}

/**
 * Error thrown by the sharding lib, identified by a stable {@link ShardingErrorCode}. `retryable` and
 * `failureKind` follow from the code, so `classifyFailure` from `@platform/primitives` reads them directly.
 */
export class ShardingError extends PlatformError {
  override readonly code: ShardingErrorCode;
  readonly failureKind: FailureKind;

  constructor(
    code: ShardingErrorCode,
    message: string,
    options: ShardingErrorOptions = {},
  ) {
    const failureKind = FAILURE_KIND[code];
    super(message, {
      retryable: failureKind === FailureKind.Transient,
      details: options.details,
      cause: options.cause,
    });
    this.code = code;
    this.failureKind = failureKind;
  }
}

/** Raised when a tenant's placement lives in a region this process does not serve. */
export class WrongRegionError extends ShardingError {
  readonly region: string;

  constructor(region: string) {
    super(ShardingErrorCode.WrongRegion, 'Tenant is placed in another region', {
      details: { region },
    });
    this.region = region;
  }
}
