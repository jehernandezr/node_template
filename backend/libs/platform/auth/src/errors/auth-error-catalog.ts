import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { AuthErrorCode } from './auth-error-code.enum.js';

/** Catalog of the `@platform/auth` codes. */
export const authErrorCatalog = defineErrorCatalog(AuthErrorCode, {
  [AuthErrorCode.TokenExpired]: ErrorSpecs.pub(
    401,
    true,
    'El access token venció. Refresca la sesión y reintenta.',
  ),
  [AuthErrorCode.InvalidKey]: ErrorSpecs.internal(
    500,
    false,
    'La clave pública del token no es una clave EC P-256 válida.',
  ),
  [AuthErrorCode.JwksUnavailable]: ErrorSpecs.internal(
    503,
    true,
    'No se pudo obtener el conjunto de claves públicas del emisor.',
  ),
});
