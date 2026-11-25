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

/** `POST /v1/me/mfa/totp`: creates the TOTP secret. Requires recent MFA. */
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
    'Creates the TOTP secret and its URI. The factor becomes active once confirmed.',
});

/** `POST /v1/me/mfa/totp/confirm`: enables TOTP and returns the recovery codes. */
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
    'Confirms the TOTP with the first code and returns the recovery codes.',
});

/** `DELETE /v1/me/mfa/totp`: removes the TOTP. Requires recent MFA. */
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
  description: 'Removes the TOTP from the account and sends a security alert.',
});

/** `POST /v1/me/mfa/recovery-codes`: generates new recovery codes. Requires recent MFA. */
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
    'Replaces the recovery codes and returns the new ones only once.',
});

/** `POST /v1/auth/mfa/recoveries`: starts the recovery of an account without factors. */
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
    'Starts MFA recovery and sends the token by email. It is confirmed after the indicated wait.',
});

/** `POST /v1/auth/mfa/recoveries/confirm`: completes the recovery and creates the session. */
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
    'Confirms MFA recovery, disables the previous factors and creates the session.',
});
