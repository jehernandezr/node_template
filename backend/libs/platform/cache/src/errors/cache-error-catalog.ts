import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { CacheErrorCode } from './cache-error-code.enum.js';

/** Catalog of the `@platform/cache` codes; none reaches the client. */
export const cacheErrorCatalog = defineErrorCatalog(CacheErrorCode, {
  [CacheErrorCode.InvalidArgument]: ErrorSpecs.internal(
    500,
    false,
    'Invalid argument when using the cache.',
  ),
  [CacheErrorCode.KeyTooLong]: ErrorSpecs.internal(
    500,
    false,
    'The cache key exceeds the maximum length.',
  ),
  [CacheErrorCode.ValueTooLarge]: ErrorSpecs.internal(
    500,
    false,
    'The value exceeds the maximum size stored in the cache.',
  ),
  [CacheErrorCode.Timeout]: ErrorSpecs.internal(
    504,
    true,
    'The cache did not respond in time.',
  ),
  [CacheErrorCode.CorruptEntry]: ErrorSpecs.internal(
    500,
    false,
    'A cache entry has an invalid format.',
  ),
});
