import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { BloomErrorCode } from './bloom-error-code.enum.js';

/** Catalog of the `@platform/bloom` codes; none reaches the client. */
export const bloomErrorCatalog = defineErrorCatalog(BloomErrorCode, {
  [BloomErrorCode.InvalidParameters]: ErrorSpecs.internal(
    500,
    false,
    'The Bloom filter parameters are invalid.',
  ),
  [BloomErrorCode.CorruptedData]: ErrorSpecs.internal(
    500,
    false,
    'The serialized Bloom filter data is corrupt.',
  ),
  [BloomErrorCode.IncompatibleFilters]: ErrorSpecs.internal(
    500,
    false,
    'The Bloom filters do not have the same parameters.',
  ),
});
