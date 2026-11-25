import {
  Access,
  defineRoute,
  HttpMethod,
  PageQuerySchema,
  PlatformErrorCode,
} from '@contracts/platform';
import { MfaRules } from '../constants/identity.constants.js';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  SignInResponseSchema,
  StepUpResultSchema,
} from '../schemas/auth.schema.js';
import {
  PasskeyMfaOptionsRequestSchema,
  PasskeyMfaVerifyRequestSchema,
  PasskeyOptionsSchema,
  PasskeyPageSchema,
  PasskeyStepUpOptionsRequestSchema,
  PasskeyStepUpVerifyRequestSchema,
  PasskeySignInVerifyRequestSchema,
  PasskeySummarySchema,
  RegisterPasskeyRequestSchema,
  RemovePasskeyRequestSchema,
} from '../schemas/passkey.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/** `POST /v1/auth/passkeys/options`: options to sign in with a passkey. */
export const PasskeySignInOptionsRoute = defineRoute({
  id: IdentityRoute.PasskeySignInOptions,
  method: HttpMethod.Post,
  path: '/v1/auth/passkeys/options',
  response: PasskeyOptionsSchema,
  successStatus: 201,
  errors: [PlatformErrorCode.RateLimitExceeded],
  access: Access.public(),
  description: 'Creates the challenge for a passkey sign-in.',
});

/** `POST /v1/auth/passkeys/verify`: verifies the passkey and starts the session. */
export const PasskeySignInVerifyRoute = defineRoute({
  id: IdentityRoute.PasskeySignInVerify,
  method: HttpMethod.Post,
  path: '/v1/auth/passkeys/verify',
  request: PasskeySignInVerifyRequestSchema,
  response: SignInResponseSchema,
  errors: [
    IdentityErrorCode.PasskeyVerificationFailed,
    IdentityErrorCode.PasskeyChallengeExpired,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Verifies the passkey response and returns tokens or an MFA challenge.',
});

/** `POST /v1/auth/mfa/passkey/options`: passkey options as a second factor. */
export const PasskeyMfaOptionsRoute = defineRoute({
  id: IdentityRoute.PasskeyMfaOptions,
  method: HttpMethod.Post,
  path: '/v1/auth/mfa/passkey/options',
  request: PasskeyMfaOptionsRequestSchema,
  response: PasskeyOptionsSchema,
  successStatus: 201,
  errors: [
    IdentityErrorCode.MfaTokenInvalid,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Creates the passkey challenge for the second factor of a pending login.',
});

/** `POST /v1/auth/mfa/passkey/verify`: verifies the passkey as a second factor. */
export const PasskeyMfaVerifyRoute = defineRoute({
  id: IdentityRoute.PasskeyMfaVerify,
  method: HttpMethod.Post,
  path: '/v1/auth/mfa/passkey/verify',
  request: PasskeyMfaVerifyRequestSchema,
  response: SignInResponseSchema,
  errors: [
    IdentityErrorCode.MfaTokenInvalid,
    IdentityErrorCode.PasskeyVerificationFailed,
    IdentityErrorCode.PasskeyChallengeExpired,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description: 'Verifies the passkey as second factor and creates the session.',
});

/** `POST /v1/me/step-up/passkey/options`: passkey options for the step-up. */
export const PasskeyStepUpOptionsRoute = defineRoute({
  id: IdentityRoute.PasskeyStepUpOptions,
  method: HttpMethod.Post,
  path: '/v1/me/step-up/passkey/options',
  request: PasskeyStepUpOptionsRequestSchema,
  response: PasskeyOptionsSchema,
  successStatus: 201,
  errors: [...SessionGuardErrors, IdentityErrorCode.MfaTokenInvalid],
  access: Access.authenticated(),
  description:
    'Creates the passkey challenge for the step-up of an open session.',
});

/** `POST /v1/me/step-up/passkey/verify`: verifies the step-up passkey. */
export const PasskeyStepUpVerifyRoute = defineRoute({
  id: IdentityRoute.PasskeyStepUpVerify,
  method: HttpMethod.Post,
  path: '/v1/me/step-up/passkey/verify',
  request: PasskeyStepUpVerifyRequestSchema,
  response: StepUpResultSchema,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaTokenInvalid,
    IdentityErrorCode.PasskeyVerificationFailed,
    IdentityErrorCode.PasskeyChallengeExpired,
  ],
  access: Access.authenticated(),
  description:
    'Verifies the step-up passkey and returns an access token with the new MFA.',
});

/** `GET /v1/me/passkeys`: the user's registered passkeys. */
export const ListPasskeysRoute = defineRoute({
  id: IdentityRoute.ListPasskeys,
  method: HttpMethod.Get,
  path: '/v1/me/passkeys',
  request: PageQuerySchema,
  response: PasskeyPageSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Lists the registered passkeys of the user.',
});

/** `POST /v1/me/passkeys/registration-options`: options to register a passkey. Requires recent MFA. */
export const PasskeyRegistrationOptionsRoute = defineRoute({
  id: IdentityRoute.PasskeyRegistrationOptions,
  method: HttpMethod.Post,
  path: '/v1/me/passkeys/registration-options',
  response: PasskeyOptionsSchema,
  successStatus: 201,
  errors: [...SessionGuardErrors, IdentityErrorCode.MfaStepUpRequired],
  access: Access.authenticated({
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Creates the challenge to register a new passkey.',
});

/** `POST /v1/me/passkeys`: registers the passkey with the authenticator response. */
export const RegisterPasskeyRoute = defineRoute({
  id: IdentityRoute.RegisterPasskey,
  method: HttpMethod.Post,
  path: '/v1/me/passkeys',
  request: RegisterPasskeyRequestSchema,
  response: PasskeySummarySchema,
  successStatus: 201,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.PasskeyVerificationFailed,
    IdentityErrorCode.PasskeyChallengeExpired,
  ],
  access: Access.authenticated(),
  description: 'Registers a new passkey with the authenticator response.',
});

/** `DELETE /v1/me/passkeys/{passkeyId}`: removes a passkey. Requires recent MFA. */
export const RemovePasskeyRoute = defineRoute({
  id: IdentityRoute.RemovePasskey,
  method: HttpMethod.Delete,
  path: '/v1/me/passkeys/{passkeyId}',
  request: RemovePasskeyRequestSchema,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaStepUpRequired,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Removes a passkey from the account.',
});
