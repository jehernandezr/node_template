import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ShardingErrorCode } from './sharding-error-code.enum.js';

/**
 * Catálogo de los códigos de `@platform/sharding`. Repite el estado HTTP y la
 * audiencia que hoy tiene el catálogo central, así que ningún código observable cambia.
 */
export const shardingErrorCatalog = defineErrorCatalog(ShardingErrorCode, {
  [ShardingErrorCode.KeyMissing]: ErrorSpecs.pub(
    400,
    false,
    'Falta la clave de fragmentación del tenant en la solicitud.',
  ),
  [ShardingErrorCode.CrossShardTransaction]: ErrorSpecs.pub(
    409,
    false,
    'La transacción involucra datos de más de un fragmento.',
  ),
  [ShardingErrorCode.TenantMigrating]: ErrorSpecs.pub(
    503,
    true,
    'El tenant se está migrando. Intenta de nuevo en unos instantes.',
  ),
  [ShardingErrorCode.TenantNotWritable]: ErrorSpecs.pub(
    503,
    true,
    'El tenant está en solo lectura por mantenimiento. Intenta más tarde.',
  ),
  [ShardingErrorCode.UnknownTenant]: ErrorSpecs.internal(
    500,
    false,
    'El tenant no está en el directorio de fragmentos.',
  ),
  [ShardingErrorCode.UnknownShard]: ErrorSpecs.internal(
    500,
    false,
    'El fragmento indicado no existe en la configuración.',
  ),
  [ShardingErrorCode.WrongRegion]: ErrorSpecs.internal(
    500,
    false,
    'El tenant pertenece a otra región; la petición debió enrutarse allá.',
  ),
  [ShardingErrorCode.InvalidTenantId]: ErrorSpecs.internal(
    400,
    false,
    'El id del tenant no tiene el formato esperado.',
  ),
  [ShardingErrorCode.InvalidKey]: ErrorSpecs.internal(
    400,
    false,
    'La llave de enrutamiento no es válida.',
  ),
  [ShardingErrorCode.InvalidConfiguration]: ErrorSpecs.internal(
    500,
    false,
    'La configuración de sharding no es válida.',
  ),
});
