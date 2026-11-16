import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { MfaRules } from '../constants/identity.constants.js';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  MfaRecoveryConfirmRequestSchema,
  MfaRecoveryStartedSchema,
  MfaRecoveryStartRequestSchema,
  RecoveryCodesSchema,
  TotpConfirmRequestSchema,
  TotpEnrollmentSchema,
} from '../schemas/mfa.schema.js';
import { SignInResponseSchema } from '../schemas/auth.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

const stepUp = Access.authenticated({
  mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
});

/** `POST /v1/me/mfa/totp`: crea el secreto TOTP. Exige MFA reciente. */
export const StartTotpEnrollmentRoute = defineRoute({
  id: IdentityRoute.StartTotpEnrollment,
  method: HttpMethod.Post,
  path: '/v1/me/mfa/totp',
  response: TotpEnrollmentSchema,
  successStatus: 201,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.MfaFactorAlreadyEnrolled,
  ],
  access: stepUp,
  description:
    'Crea el secreto TOTP y su URI. El factor queda activo al confirmarlo.',
});

/** `POST /v1/me/mfa/totp/confirm`: activa el TOTP y devuelve los códigos de recuperación. */
export const ConfirmTotpEnrollmentRoute = defineRoute({
  id: IdentityRoute.ConfirmTotpEnrollment,
  method: HttpMethod.Post,
  path: '/v1/me/mfa/totp/confirm',
  request: TotpConfirmRequestSchema,
  response: RecoveryCodesSchema,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaCodeInvalid,
    IdentityErrorCode.MfaCodeExpired,
    IdentityErrorCode.MfaTooManyAttempts,
  ],
  access: Access.authenticated(),
  description:
    'Confirma el TOTP con el primer código y devuelve los códigos de recuperación.',
});

/** `DELETE /v1/me/mfa/totp`: quita el TOTP. Exige MFA reciente. */
export const RemoveTotpRoute = defineRoute({
  id: IdentityRoute.RemoveTotp,
  method: HttpMethod.Delete,
  path: '/v1/me/mfa/totp',
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.MfaFactorNotEnrolled,
  ],
  access: stepUp,
  description: 'Quita el TOTP de la cuenta y avisa por alerta de seguridad.',
});

/** `POST /v1/me/mfa/recovery-codes`: genera códigos de recuperación nuevos. Exige MFA reciente. */
export const RegenerateRecoveryCodesRoute = defineRoute({
  id: IdentityRoute.RegenerateRecoveryCodes,
  method: HttpMethod.Post,
  path: '/v1/me/mfa/recovery-codes',
  response: RecoveryCodesSchema,
  successStatus: 201,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.MfaFactorNotEnrolled,
  ],
  access: stepUp,
  description:
    'Reemplaza los códigos de recuperación y devuelve los nuevos una sola vez.',
});

/** `POST /v1/auth/mfa/recoveries`: inicia la recuperación de una cuenta sin factores. */
export const StartMfaRecoveryRoute = defineRoute({
  id: IdentityRoute.StartMfaRecovery,
  method: HttpMethod.Post,
  path: '/v1/auth/mfa/recoveries',
  request: MfaRecoveryStartRequestSchema,
  response: MfaRecoveryStartedSchema,
  successStatus: 202,
  errors: [
    IdentityErrorCode.MfaTokenInvalid,
    IdentityErrorCode.MfaRecoveryNotReady,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Inicia la recuperación de MFA y envía el token por email. Se confirma después de la espera indicada.',
});

/** `POST /v1/auth/mfa/recoveries/confirm`: completa la recuperación y crea la sesión. */
export const ConfirmMfaRecoveryRoute = defineRoute({
  id: IdentityRoute.ConfirmMfaRecovery,
  method: HttpMethod.Post,
  path: '/v1/auth/mfa/recoveries/confirm',
  request: MfaRecoveryConfirmRequestSchema,
  response: SignInResponseSchema,
  errors: [
    IdentityErrorCode.MfaTokenInvalid,
    IdentityErrorCode.MfaRecoveryNotReady,
    IdentityErrorCode.MfaCodeInvalid,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Confirma la recuperación de MFA, desactiva los factores anteriores y crea la sesión.',
});
