/** Códigos de error estables de `@platform/persistence`. */
export enum PersistenceErrorCode {
  QueryFailed = 'PLATFORM.PERSISTENCE.QUERY_FAILED',
  InvalidConfig = 'PLATFORM.PERSISTENCE.INVALID_CONFIG',
  TransactionRequired = 'PLATFORM.PERSISTENCE.TRANSACTION_REQUIRED',
  TenantRequired = 'PLATFORM.PERSISTENCE.TENANT_REQUIRED',
  TenantMismatch = 'PLATFORM.PERSISTENCE.TENANT_MISMATCH',
  CorruptRow = 'PLATFORM.PERSISTENCE.CORRUPT_ROW',
  Contention = 'PLATFORM.PERSISTENCE.CONTENTION',
  ShuttingDown = 'PLATFORM.PERSISTENCE.SHUTTING_DOWN',
}
