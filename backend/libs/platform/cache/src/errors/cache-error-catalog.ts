import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { CacheErrorCode } from './cache-error-code.enum.js';

/** Catálogo de los códigos de `@platform/cache`; ninguno llega al cliente. */
export const cacheErrorCatalog = defineErrorCatalog(CacheErrorCode, {
  [CacheErrorCode.InvalidArgument]: ErrorSpecs.internal(
    500,
    false,
    'Argumento inválido al usar la caché.',
  ),
  [CacheErrorCode.KeyTooLong]: ErrorSpecs.internal(
    500,
    false,
    'La llave de caché supera la longitud máxima.',
  ),
  [CacheErrorCode.ValueTooLarge]: ErrorSpecs.internal(
    500,
    false,
    'El valor supera el tamaño máximo que se guarda en caché.',
  ),
  [CacheErrorCode.Timeout]: ErrorSpecs.internal(
    504,
    true,
    'La caché no respondió dentro del plazo.',
  ),
  [CacheErrorCode.CorruptEntry]: ErrorSpecs.internal(
    500,
    false,
    'Una entrada de caché tiene un formato inválido.',
  ),
});
