import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { RateLimitErrorCode } from './rate-limit-error-code.enum.js';

/** Catalog of the `@platform/rate-limit` codes. */
export const rateLimitErrorCatalog = defineErrorCatalog(RateLimitErrorCode, {
  [RateLimitErrorCode.Exceeded]: ErrorSpecs.pub(
    429,
    true,
    'The request limit was exceeded. Try again later.',
  ),
});
