/**
 * Códigos de error transversales a toda la plataforma.
 * Formato: SERVICIO.SUBMÓDULO.ERROR. Los códigos de cada servicio viven en su propio contrato.
 */
export enum PlatformErrorCode {
  ValidationInvalidInput = 'PLATFORM.VALIDATION.INVALID_INPUT',
  ValidationRequired = 'PLATFORM.VALIDATION.REQUIRED',
  InternalUnexpected = 'PLATFORM.INTERNAL.UNEXPECTED',
  AuthUnauthenticated = 'PLATFORM.AUTH.UNAUTHENTICATED',
  AuthForbidden = 'PLATFORM.AUTH.FORBIDDEN',
  RateLimitExceeded = 'PLATFORM.RATE_LIMIT.EXCEEDED',
  ApiVersionSunset = 'PLATFORM.API.VERSION_SUNSET',
  ResourceNotFound = 'PLATFORM.RESOURCE.NOT_FOUND',
  ConflictVersionMismatch = 'PLATFORM.CONFLICT.VERSION_MISMATCH',
  KernelInvalidId = 'PLATFORM.KERNEL.INVALID_ID',
  ShardingKeyMissing = 'PLATFORM.SHARDING.KEY_MISSING',
  ShardingCrossShardTx = 'PLATFORM.SHARDING.CROSS_SHARD_TX',
  ShardingTenantMigrating = 'PLATFORM.SHARDING.TENANT_MIGRATING',
}
