import {
  defineErrorCatalog,
  ErrorSpecs,
  ProblemDetailKey,
} from '@contracts/platform';
import { ShardingErrorCode } from './sharding-error-code.enum.js';

/**
 * Catálogo de los códigos de `@platform/sharding`. Los públicos repiten los del
 * catálogo central, que solo guarda los transversales.
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
  [ShardingErrorCode.WrongRegion]: ErrorSpecs.pub(
    421,
    false,
    'El tenant vive en otra región. Repite la petición contra la URL de `details.apiBaseUrl`.',
    [ProblemDetailKey.ApiBaseUrl, ProblemDetailKey.Region],
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
