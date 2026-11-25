import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { RateLimitErrorCode } from './rate-limit-error-code.enum.js';

/** Catalog of the `@platform/rate-limit` codes. */
export const rateLimitErrorCatalog = defineErrorCatalog(RateLimitErrorCode, {
  [RateLimitErrorCode.Exceeded]: ErrorSpecs.pub(
    429,
    true,
    'Se superó el límite de solicitudes. Intenta de nuevo más tarde.',
  ),
});
