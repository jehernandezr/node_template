import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { AuthErrorCode } from './auth-error-code.enum.js';

/** Catalog of the `@platform/auth` codes. */
export const authErrorCatalog = defineErrorCatalog(AuthErrorCode, {
  [AuthErrorCode.TokenExpired]: ErrorSpecs.pub(
    401,
    true,
    'The access token expired. Refresh the session and retry.',
  ),
  [AuthErrorCode.InvalidKey]: ErrorSpecs.internal(
    500,
    false,
    'The token public key is not a valid EC P-256 key.',
  ),
  [AuthErrorCode.JwksUnavailable]: ErrorSpecs.internal(
    503,
    true,
    'Could not fetch the issuer public key set.',
  ),
});
