import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { RateLimitErrorCode } from './rate-limit-error-code.enum.js';

/** Catálogo de los códigos de `@platform/rate-limit`. */
export const rateLimitErrorCatalog = defineErrorCatalog(RateLimitErrorCode, {
  [RateLimitErrorCode.Exceeded]: ErrorSpecs.pub(
    429,
    true,
    'Se superó el límite de solicitudes. Intenta de nuevo más tarde.',
  ),
});
