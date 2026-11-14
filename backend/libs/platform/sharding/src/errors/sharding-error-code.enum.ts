/** Códigos de error estables de `@platform/sharding`. */
export enum ShardingErrorCode {
  KeyMissing = 'PLATFORM.SHARDING.KEY_MISSING',
  CrossShardTransaction = 'PLATFORM.SHARDING.CROSS_SHARD_TX',
  TenantMigrating = 'PLATFORM.SHARDING.TENANT_MIGRATING',
  TenantNotWritable = 'PLATFORM.SHARDING.TENANT_NOT_WRITABLE',
  UnknownTenant = 'PLATFORM.SHARDING.UNKNOWN_TENANT',
  UnknownShard = 'PLATFORM.SHARDING.UNKNOWN_SHARD',
  WrongRegion = 'PLATFORM.SHARDING.WRONG_REGION',
  /** El id del tenant no es un UUIDv7 (o no cumple el formato configurado). */
  InvalidTenantId = 'PLATFORM.SHARDING.INVALID_TENANT_ID',
  /** La clave de enrutamiento supera el máximo configurado. */
  InvalidKey = 'PLATFORM.SHARDING.INVALID_KEY',
  /** Un constructor o método recibió una opción inválida. Es un error de programación. */
  InvalidConfiguration = 'PLATFORM.SHARDING.INVALID_CONFIG',
}
