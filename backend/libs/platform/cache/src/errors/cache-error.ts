import { PlatformError } from '@platform/kernel';
import type { CacheErrorCode } from './cache-error-code.enum.js';

/**
 * Base of the `@platform/cache` errors. Messages do not include cache keys or
 * values, because cached data may be personal.
 */
export abstract class CacheError extends PlatformError {
  abstract override readonly code: CacheErrorCode;
}
