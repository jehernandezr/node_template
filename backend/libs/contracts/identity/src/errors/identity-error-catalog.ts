import { defineErrorCatalog, ErrorAudience } from '@contracts/platform';
import { IdentityErrorCode as C } from '../enums/identifiers.enum.js';

/** Catálogo de los códigos de identity. */
export const identityErrorCatalog = defineErrorCatalog(C, {
  [C.AuthInvalidCredentials]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'El email o la contraseña no son válidos, o el origen está bloqueado por intentos fallidos.',
  },
  [C.MfaTokenInvalid]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'El desafío MFA no existe o venció. Inicia sesión de nuevo.',
  },
  [C.MfaCodeInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'El código de verificación no es correcto.',
  },
  [C.MfaCodeExpired]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'El código de verificación expiró. Solicita uno nuevo.',
  },
  [C.MfaTooManyAttempts]: {
    httpStatus: 429,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'Se agotaron los intentos del desafío. Solicita uno nuevo.',
  },
  [C.MfaStepUpRequired]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La operación exige verificar de nuevo el segundo factor.',
  },
  [C.MfaMethodUnavailable]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'El método pedido no está entre los que ofreció el desafío MFA. Elige otro.',
  },
  [C.SessionRevoked]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La sesión fue cerrada. Inicia sesión de nuevo.',
  },
  [C.SessionExpired]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'La sesión venció por inactividad o por el tope absoluto. Inicia sesión de nuevo.',
  },
  [C.SessionReused]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'Se presentó un session token ya rotado. La sesión completa quedó revocada. Inicia sesión de nuevo.',
  },
  [C.TokenStalePermissions]: {
    httpStatus: 401,
    retryable: true,
    audience: ErrorAudience.Public,
    description:
      'Los permisos cambiaron desde que se emitió el token. El cliente refresca y reintenta.',
  },
  [C.TokenRevoked]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'El access token fue revocado por la época del usuario o del tenant. Inicia sesión de nuevo.',
  },
  [C.UserNotFound]: {
    httpStatus: 404,
    retryable: false,
    audience: ErrorAudience.Internal,
    description: 'El usuario no existe.',
  },
  [C.UserSuspended]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'El usuario está suspendido. Sus sesiones quedan cerradas hasta que se reactive.',
  },
  [C.TenantSuspended]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'El tenant está suspendido. Las sesiones en él quedan cerradas hasta que se reactive.',
  },
});
