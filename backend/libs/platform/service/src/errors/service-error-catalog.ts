import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ServiceErrorCode } from './service-error-code.enum.js';

/** Catalog of the `@platform/service` codes; none of them reaches the client. */
export const serviceErrorCatalog = defineErrorCatalog(ServiceErrorCode, {
  [ServiceErrorCode.InvalidDefinition]: ErrorSpecs.internal(
    500,
    false,
    'La definición del servicio es inconsistente y el proceso no puede arrancar.',
  ),
  [ServiceErrorCode.ShutdownTimeout]: ErrorSpecs.internal(
    500,
    false,
    'El servicio no terminó de cerrar dentro del plazo de gracia.',
  ),
});
