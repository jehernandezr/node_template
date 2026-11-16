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
  [C.AuthEmailNotVerified]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'El email todavía no está verificado. Confirma el enlace que enviamos a tu correo.',
  },
  [C.UserEmailVerificationInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'El enlace de verificación del email no es válido o venció. Solicita uno nuevo.',
  },
  [C.PasswordPolicyViolation]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'La contraseña no cumple la política: de 12 a 128 caracteres y distinta del email.',
  },
  [C.PasswordBreached]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La contraseña aparece en filtraciones conocidas. Elige otra.',
  },
  [C.PasswordCurrentInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La contraseña actual no es correcta.',
  },
  [C.PasswordResetInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'El enlace para restablecer la contraseña no es válido o venció. Solicita uno nuevo.',
  },
  [C.DeviceSignatureInvalid]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La firma del dispositivo no es válida.',
  },
  [C.DeviceKeyInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La clave pública del dispositivo no es válida.',
  },
  [C.MfaRecoveryNotReady]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'La recuperación del segundo factor todavía no está disponible. Intenta de nuevo cuando termine la espera.',
  },
  [C.MfaFactorAlreadyEnrolled]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'Ese segundo factor ya está activo.',
  },
  [C.MfaFactorNotEnrolled]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'Ese segundo factor no está activo.',
  },
  [C.PasskeyVerificationFailed]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'No se pudo verificar la passkey.',
  },
  [C.PasskeyChallengeExpired]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'El desafío de la passkey venció. Inténtalo de nuevo.',
  },
  [C.TenantNotFound]: {
    httpStatus: 404,
    retryable: false,
    audience: ErrorAudience.Internal,
    description: 'El tenant no existe.',
  },
  [C.TenantSlugTaken]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'El identificador del tenant ya está en uso. Elige otro.',
  },
  [C.TenantNotMember]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'No eres miembro de ese tenant.',
  },
  [C.AccessLastOwner]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'El tenant debe conservar al menos un propietario.',
  },
  [C.AccessSystemRoleImmutable]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'Los roles de sistema no se pueden modificar ni borrar.',
  },
  [C.AccessNameTaken]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'Ya existe un grupo o rol con ese nombre.',
  },
  [C.InvitationInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La invitación no es válida, venció o ya se usó.',
  },
  [C.InvitationEmailMismatch]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'El email verificado de tu cuenta no coincide con el de la invitación.',
  },
  [C.ApiKeyInvalid]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La API key no es válida.',
  },
  [C.ApiKeyExpired]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La API key venció.',
  },
  [C.ApiKeyIpNotAllowed]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La API key no puede usarse desde esta dirección IP.',
  },
  [C.ApiKeyPermissionNotGrantable]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'No puedes otorgar permisos que tu cuenta no tiene.',
  },
  [C.ServiceAccountDisabled]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'La cuenta de servicio está deshabilitada.',
  },
});
