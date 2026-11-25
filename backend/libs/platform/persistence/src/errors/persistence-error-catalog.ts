import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { PersistenceErrorCode } from './persistence-error-code.enum.js';

/** Catalog of the `@platform/persistence` codes. None of them reaches the client. */
export const persistenceErrorCatalog = defineErrorCatalog(
  PersistenceErrorCode,
  {
    [PersistenceErrorCode.QueryFailed]: ErrorSpecs.internal(
      500,
      false,
      'A database statement failed.',
    ),
    [PersistenceErrorCode.InvalidConfig]: ErrorSpecs.internal(
      500,
      false,
      'The persistence configuration is not valid.',
    ),
    [PersistenceErrorCode.TransactionRequired]: ErrorSpecs.internal(
      500,
      false,
      'The operation requires an open transaction.',
    ),
    [PersistenceErrorCode.TenantRequired]: ErrorSpecs.internal(
      400,
      false,
      'The operation requires a tenant in the context.',
    ),
    [PersistenceErrorCode.TenantMismatch]: ErrorSpecs.internal(
      403,
      false,
      'The row belongs to another tenant.',
    ),
    [PersistenceErrorCode.CorruptRow]: ErrorSpecs.internal(
      500,
      false,
      'A row read does not have the expected format.',
    ),
    [PersistenceErrorCode.Contention]: ErrorSpecs.internal(
      503,
      true,
      'There is contention on the same record; retry.',
    ),
    [PersistenceErrorCode.ShuttingDown]: ErrorSpecs.internal(
      503,
      true,
      'The process is shutting down and already closed its shard connections; another process can serve.',
    ),
  },
);
