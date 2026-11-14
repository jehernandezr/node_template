import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ConfigErrorCode } from './config-error-code.enum.js';

/** Catálogo de los códigos de `@platform/config`; ninguno llega al cliente. */
export const configErrorCatalog = defineErrorCatalog(ConfigErrorCode, {
  [ConfigErrorCode.Invalid]: ErrorSpecs.internal(
    500,
    false,
    'La configuración del entorno no cumple el esquema.',
  ),
});
