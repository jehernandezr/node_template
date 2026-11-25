import { FailureKind, PlatformError } from '@platform/kernel';
import { ShardingErrorCode } from './sharding-error-code.enum.js';

/**
 * How each code fails. Only `TenantMigrating` is transient: the move saga
 * finishes and the same request works. A missing key, a cross-shard
 * transaction or an invalid option are caller faults, that is,
 * protocol violations.
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

/** Options of a {@link ShardingError}. `retryable` comes from the code. */
export interface ShardingErrorOptions {
  /** Diagnostic data. Never secrets or raw request values beyond identifiers. */
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
}

/**
 * Error of `@platform/sharding`, identified by a stable {@link ShardingErrorCode}.
 * `retryable` and `failureKind` come from the code, so
 * `FailureClassifier` from `@platform/primitives` reads them directly.
 */
export class ShardingError extends PlatformError {
  override readonly code: ShardingErrorCode;
  declare readonly failureKind: FailureKind;

  constructor(
    code: ShardingErrorCode,
    message: string,
    options: ShardingErrorOptions = {},
  ) {
    const failureKind = FAILURE_KIND[code];
    super(message, {
      retryable: failureKind === FailureKind.Transient,
      failureKind,
      details: options.details,
      cause: options.cause,
    });
    this.code = code;
  }
}
