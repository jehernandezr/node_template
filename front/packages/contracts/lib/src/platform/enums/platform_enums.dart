// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

/// Public error codes of the `platform` contract.
///
/// Only includes codes with `public` audience: internal ones never
/// reach the client. [messageKey] is the message key in the ARB.
enum PlatformErrorCode {
  /// The input does not match the expected format or rules.
  validationInvalidInput(
    'PLATFORM.VALIDATION.INVALID_INPUT',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_invalid_input',
  ),

  /// A required field is missing.
  validationRequired(
    'PLATFORM.VALIDATION.REQUIRED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_required',
  ),

  /// A field has a different data type than expected.
  validationInvalidType(
    'PLATFORM.VALIDATION.INVALID_TYPE',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_invalid_type',
  ),

  /// A field does not match the expected format, such as email, UUID or pattern.
  validationInvalidFormat(
    'PLATFORM.VALIDATION.INVALID_FORMAT',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_invalid_format',
  ),

  /// A field has a value that is not among the allowed ones.
  validationInvalidEnum(
    'PLATFORM.VALIDATION.INVALID_ENUM',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_invalid_enum',
  ),

  /// A text or a list has fewer elements than allowed.
  validationTooShort(
    'PLATFORM.VALIDATION.TOO_SHORT',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_too_short',
  ),

  /// A text or a list has more elements than allowed.
  validationTooLong(
    'PLATFORM.VALIDATION.TOO_LONG',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_too_long',
  ),

  /// A number is lower than the allowed minimum.
  validationTooSmall(
    'PLATFORM.VALIDATION.TOO_SMALL',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_too_small',
  ),

  /// A number is greater than the allowed maximum.
  validationTooLarge(
    'PLATFORM.VALIDATION.TOO_LARGE',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_too_large',
  ),

  /// The request includes a field the contract does not define.
  validationUnknownField(
    'PLATFORM.VALIDATION.UNKNOWN_FIELD',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_validation_unknown_field',
  ),

  /// An unexpected server error occurred.
  internalUnexpected(
    'PLATFORM.INTERNAL.UNEXPECTED',
    httpStatus: 500,
    retryable: false,
    messageKey: 'error_platform_internal_unexpected',
  ),

  /// The request does not include valid credentials.
  authUnauthenticated(
    'PLATFORM.AUTH.UNAUTHENTICATED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_platform_auth_unauthenticated',
  ),

  /// You do not have permission to perform this action.
  authForbidden(
    'PLATFORM.AUTH.FORBIDDEN',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_platform_auth_forbidden',
  ),

  /// The access token expired. The client refreshes the session and retries.
  authTokenExpired(
    'PLATFORM.AUTH.TOKEN_EXPIRED',
    httpStatus: 401,
    retryable: true,
    messageKey: 'error_platform_auth_token_expired',
  ),

  /// The origin of the request is not allowed.
  authOriginRejected(
    'PLATFORM.AUTH.ORIGIN_REJECTED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_platform_auth_origin_rejected',
  ),

  /// The request limit was exceeded. Try again later.
  rateLimitExceeded(
    'PLATFORM.RATE_LIMIT.EXCEEDED',
    httpStatus: 429,
    retryable: true,
    messageKey: 'error_platform_rate_limit_exceeded',
  ),

  /// This API version is no longer available.
  apiVersionSunset(
    'PLATFORM.API.VERSION_SUNSET',
    httpStatus: 410,
    retryable: false,
    messageKey: 'error_platform_api_version_sunset',
  ),

  /// The requested API version is not supported.
  apiUnsupportedVersion(
    'PLATFORM.API.UNSUPPORTED_VERSION',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_api_unsupported_version',
  ),

  /// The request body exceeds the allowed size.
  httpPayloadTooLarge(
    'PLATFORM.HTTP.PAYLOAD_TOO_LARGE',
    httpStatus: 413,
    retryable: false,
    messageKey: 'error_platform_http_payload_too_large',
  ),

  /// The content type of the request is not supported.
  httpUnsupportedMediaType(
    'PLATFORM.HTTP.UNSUPPORTED_MEDIA_TYPE',
    httpStatus: 415,
    retryable: false,
    messageKey: 'error_platform_http_unsupported_media_type',
  ),

  /// The request body is not valid JSON.
  httpMalformedBody(
    'PLATFORM.HTTP.MALFORMED_BODY',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_http_malformed_body',
  ),

  /// The tenant plan does not include the feature the operation requires.
  accessFeatureNotIncluded(
    'PLATFORM.ACCESS.FEATURE_NOT_INCLUDED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_platform_access_feature_not_included',
  ),

  /// The flag that enables the route is off: it behaves like a nonexistent route.
  accessFlagDisabled(
    'PLATFORM.ACCESS.FLAG_DISABLED',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_platform_access_flag_disabled',
  ),

  /// The requested resource does not exist.
  resourceNotFound(
    'PLATFORM.RESOURCE.NOT_FOUND',
    httpStatus: 404,
    retryable: false,
    messageKey: 'error_platform_resource_not_found',
  ),

  /// The resource changed since the last read. Reload it.
  conflictVersionMismatch(
    'PLATFORM.CONFLICT.VERSION_MISMATCH',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_platform_conflict_version_mismatch',
  ),

  /// The identifier does not have a valid format.
  kernelInvalidId(
    'PLATFORM.KERNEL.INVALID_ID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_kernel_invalid_id',
  ),

  /// The tenant sharding key is missing from the request.
  shardingKeyMissing(
    'PLATFORM.SHARDING.KEY_MISSING',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_sharding_key_missing',
  ),

  /// The transaction involves data from more than one shard.
  shardingCrossShardTx(
    'PLATFORM.SHARDING.CROSS_SHARD_TX',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_platform_sharding_cross_shard_tx',
  ),

  /// The tenant is being migrated. Try again in a few moments.
  shardingTenantMigrating(
    'PLATFORM.SHARDING.TENANT_MIGRATING',
    httpStatus: 503,
    retryable: true,
    messageKey: 'error_platform_sharding_tenant_migrating',
  ),

  /// The tenant is read-only for maintenance. Try again later.
  shardingTenantNotWritable(
    'PLATFORM.SHARDING.TENANT_NOT_WRITABLE',
    httpStatus: 503,
    retryable: true,
    messageKey: 'error_platform_sharding_tenant_not_writable',
  ),

  /// The tenant lives in another region. Repeat the request against the URL in `details.apiBaseUrl`.
  shardingWrongRegion(
    'PLATFORM.SHARDING.WRONG_REGION',
    httpStatus: 421,
    retryable: false,
    messageKey: 'error_platform_sharding_wrong_region',
  ),

  /// The query filters or sorts by a field that does not exist.
  criteriaUnknownField(
    'PLATFORM.CRITERIA.UNKNOWN_FIELD',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_criteria_unknown_field',
  ),

  /// The query has an invalid value or cursor.
  criteriaInvalidValue(
    'PLATFORM.CRITERIA.INVALID_VALUE',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_criteria_invalid_value',
  ),

  /// The page size is outside the allowed range.
  criteriaInvalidLimit(
    'PLATFORM.CRITERIA.INVALID_LIMIT',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_platform_criteria_invalid_limit',
  ),

  /// A service the operation depends on is not available right now.
  resilienceCircuitOpen(
    'PLATFORM.RESILIENCE.CIRCUIT_OPEN',
    httpStatus: 503,
    retryable: true,
    messageKey: 'error_platform_resilience_circuit_open',
  ),

  /// The operation took longer than allowed.
  resilienceTimeout(
    'PLATFORM.RESILIENCE.TIMEOUT',
    httpStatus: 504,
    retryable: true,
    messageKey: 'error_platform_resilience_timeout',
  ),

  /// There are too many operations in progress. Try again in a few moments.
  resilienceBulkheadFull(
    'PLATFORM.RESILIENCE.BULKHEAD_FULL',
    httpStatus: 503,
    retryable: true,
    messageKey: 'error_platform_resilience_bulkhead_full',
  ),

  /// The service is overloaded. Try again in a few moments.
  resilienceOverloaded(
    'PLATFORM.RESILIENCE.OVERLOADED',
    httpStatus: 503,
    retryable: true,
    messageKey: 'error_platform_resilience_overloaded',
  );

  const PlatformErrorCode(
    this.code, {
    required this.httpStatus,
    required this.retryable,
    required this.messageKey,
  });

  /// Exact code sent by the backend, for example `PLATFORM.VALIDATION.INVALID_INPUT`.
  final String code;

  /// HTTP status the backend responds with.
  final int httpStatus;

  /// Whether the client may retry the same request.
  final bool retryable;

  /// ARB key of the human-readable message.
  final String messageKey;

  /// Same as [code].
  String get wireCode => code;

  /// Value with [code], or null if this client does not know it.
  static PlatformErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Same as [fromCode].
  static PlatformErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `ErrorAudience` of the `platform` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ErrorAudience {
  public('public'),
  internal('internal');

  const ErrorAudience(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ErrorAudience? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `HttpMethod` of the `platform` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum HttpMethod {
  get('GET'),
  post('POST'),
  put('PUT'),
  patch('PATCH'),
  delete('DELETE');

  const HttpMethod(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static HttpMethod? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `AccessKind` of the `platform` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum AccessKind {
  public('public'),
  authenticated('authenticated');

  const AccessKind(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static AccessKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `MessageKind` of the `platform` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum MessageKind {
  event('event'),
  command('command');

  const MessageKind(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static MessageKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `QueryValueKind` of the `platform` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum QueryValueKind {
  string('string'),
  number('number'),
  boolean('boolean');

  const QueryValueKind(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static QueryValueKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
