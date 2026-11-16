import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import { MfaRules } from '../constants/identity.constants.js';
import {
  ChangePasswordRequestSchema,
  PasswordResetConfirmRequestSchema,
  PasswordResetRequestSchema,
} from '../schemas/password.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/**
 * `POST /v1/me/password`: cambia la contraseña. Exige un MFA reciente porque
 * una sesión robada no debe poder cambiarla.
 */
export const ChangePasswordRoute = defineRoute({
  id: IdentityRoute.ChangePassword,
  method: HttpMethod.Post,
  path: '/v1/me/password',
  request: ChangePasswordRequestSchema,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.PasswordCurrentInvalid,
    IdentityErrorCode.PasswordPolicyViolation,
    IdentityErrorCode.PasswordBreached,
  ],
  access: Access.authenticated({
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Cambia la contraseña y cierra las demás sesiones del usuario.',
});

/** `POST /v1/auth/password-resets`: envía el correo de restablecimiento. */
export const RequestPasswordResetRoute = defineRoute({
  id: IdentityRoute.RequestPasswordReset,
  method: HttpMethod.Post,
  path: '/v1/auth/password-resets',
  request: PasswordResetRequestSchema,
  successStatus: 202,
  errors: [PlatformErrorCode.RateLimitExceeded],
  access: Access.public(),
  description:
    'Envía el correo para restablecer la contraseña. Responde aceptado aunque el email no exista.',
});

/** `POST /v1/auth/password-resets/confirm`: fija la contraseña nueva con el token del correo. */
export const ConfirmPasswordResetRoute = defineRoute({
  id: IdentityRoute.ConfirmPasswordReset,
  method: HttpMethod.Post,
  path: '/v1/auth/password-resets/confirm',
  request: PasswordResetConfirmRequestSchema,
  errors: [
    IdentityErrorCode.PasswordResetInvalid,
    IdentityErrorCode.PasswordPolicyViolation,
    IdentityErrorCode.PasswordBreached,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Restablece la contraseña con el token del correo y cierra las sesiones del usuario.',
});
