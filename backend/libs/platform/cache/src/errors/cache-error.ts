import { PlatformError } from '@platform/kernel';
import type { CacheErrorCode } from './cache-error-code.enum.js';

/**
 * Base de los errores de `@platform/cache`. Los mensajes no incluyen llaves ni
 * valores del caché, porque los datos cacheados pueden ser personales.
 */
export abstract class CacheError extends PlatformError {
  abstract override readonly code: CacheErrorCode;
}
