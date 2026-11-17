import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { PersistenceErrorCode } from './persistence-error-code.enum.js';

/** Catálogo de los códigos de `@platform/persistence`. Ninguno llega al cliente. */
export const persistenceErrorCatalog = defineErrorCatalog(
  PersistenceErrorCode,
  {
    [PersistenceErrorCode.QueryFailed]: ErrorSpecs.internal(
      500,
      false,
      'Falló una sentencia en la base de datos.',
    ),
    [PersistenceErrorCode.InvalidConfig]: ErrorSpecs.internal(
      500,
      false,
      'La configuración de persistencia no es válida.',
    ),
    [PersistenceErrorCode.TransactionRequired]: ErrorSpecs.internal(
      500,
      false,
      'La operación exige una transacción abierta.',
    ),
    [PersistenceErrorCode.TenantRequired]: ErrorSpecs.internal(
      400,
      false,
      'La operación exige un tenant en el contexto.',
    ),
    [PersistenceErrorCode.TenantMismatch]: ErrorSpecs.internal(
      403,
      false,
      'La fila pertenece a otro tenant.',
    ),
    [PersistenceErrorCode.CorruptRow]: ErrorSpecs.internal(
      500,
      false,
      'Una fila leída no tiene el formato esperado.',
    ),
    [PersistenceErrorCode.Contention]: ErrorSpecs.internal(
      503,
      true,
      'Hay contención sobre el mismo registro; reintentar.',
    ),
    [PersistenceErrorCode.ShuttingDown]: ErrorSpecs.internal(
      503,
      true,
      'El proceso se está apagando y ya cerró sus conexiones a los shards; otro proceso puede atender.',
    ),
  },
);
