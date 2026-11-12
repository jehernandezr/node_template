/// Error codes shared by the whole platform.
///
/// Mirrors `PlatformErrorCode` in `libs/contracts/platform`. Each value keeps
/// the exact wire [code]. Keep both sides in sync: the contracts test checks it.
enum PlatformErrorCode {
  /// The input does not match the expected format or rules.
  validationInvalidInput('PLATFORM.VALIDATION.INVALID_INPUT'),

  /// A required field is missing.
  validationRequired('PLATFORM.VALIDATION.REQUIRED'),

  /// An unexpected server error.
  internalUnexpected('PLATFORM.INTERNAL.UNEXPECTED'),

  /// The request has no valid credentials.
  authUnauthenticated('PLATFORM.AUTH.UNAUTHENTICATED'),

  /// The caller may not perform this action.
  authForbidden('PLATFORM.AUTH.FORBIDDEN'),

  /// Too many requests in a time window.
  rateLimitExceeded('PLATFORM.RATE_LIMIT.EXCEEDED'),

  /// This API version is no longer served.
  apiVersionSunset('PLATFORM.API.VERSION_SUNSET'),

  /// The requested resource does not exist.
  resourceNotFound('PLATFORM.RESOURCE.NOT_FOUND'),

  /// The resource changed since it was last read.
  conflictVersionMismatch('PLATFORM.CONFLICT.VERSION_MISMATCH'),

  /// The identifier has an invalid format.
  kernelInvalidId('PLATFORM.KERNEL.INVALID_ID'),

  /// The tenant sharding key is missing from the request.
  shardingKeyMissing('PLATFORM.SHARDING.KEY_MISSING'),

  /// The transaction spans more than one shard.
  shardingCrossShardTx('PLATFORM.SHARDING.CROSS_SHARD_TX'),

  /// The tenant is being migrated to another shard.
  shardingTenantMigrating('PLATFORM.SHARDING.TENANT_MIGRATING');

  const PlatformErrorCode(this.code);

  /// The exact string code sent by the backend, for example `PLATFORM.AUTH.FORBIDDEN`.
  final String code;

  /// Returns the value whose [code] equals [code], or null when unknown.
  static PlatformErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }
}
