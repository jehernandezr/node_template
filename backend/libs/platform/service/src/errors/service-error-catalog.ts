import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ServiceErrorCode } from './service-error-code.enum.js';

/** Catálogo de los códigos de `@platform/service`; ninguno llega al cliente. */
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
