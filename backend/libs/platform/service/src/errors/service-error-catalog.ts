import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ServiceErrorCode } from './service-error-code.enum.js';

/** Catalog of the `@platform/service` codes; none of them reaches the client. */
export const serviceErrorCatalog = defineErrorCatalog(ServiceErrorCode, {
  [ServiceErrorCode.InvalidDefinition]: ErrorSpecs.internal(
    500,
    false,
    'The service definition is inconsistent and the process cannot start.',
  ),
  [ServiceErrorCode.ShutdownTimeout]: ErrorSpecs.internal(
    500,
    false,
    'The service did not finish shutting down within the grace period.',
  ),
});
