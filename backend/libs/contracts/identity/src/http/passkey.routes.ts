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

/** `POST /v1/auth/passkeys/options`: opciones para iniciar sesión con passkey. */
export const PasskeySignInOptionsRoute = defineRoute({
  id: IdentityRoute.PasskeySignInOptions,
  method: HttpMethod.Post,
  path: '/v1/auth/passkeys/options',
  response: PasskeyOptionsSchema,
  successStatus: 201,
  errors: [PlatformErrorCode.RateLimitExceeded],
  access: Access.public(),
  description: 'Crea el desafío de un inicio de sesión con passkey.',
});

/** `POST /v1/auth/passkeys/verify`: verifica la passkey e inicia la sesión. */
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
    'Verifica la respuesta de la passkey y devuelve tokens o un desafío MFA.',
});

/** `POST /v1/auth/mfa/passkey/options`: opciones de passkey como segundo factor. */
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
    'Crea el desafío de passkey para el segundo factor de un login pendiente.',
});

/** `POST /v1/auth/mfa/passkey/verify`: verifica la passkey como segundo factor. */
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
  description: 'Verifica la passkey como segundo factor y crea la sesión.',
});

/** `POST /v1/me/step-up/passkey/options`: opciones de passkey para el paso adicional. */
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
    'Crea el desafío de passkey para el paso adicional de una sesión abierta.',
});

/** `POST /v1/me/step-up/passkey/verify`: verifica la passkey del paso adicional. */
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
    'Verifica la passkey del paso adicional y devuelve un access token con el MFA nuevo.',
});

/** `GET /v1/me/passkeys`: passkeys registradas del usuario. */
export const ListPasskeysRoute = defineRoute({
  id: IdentityRoute.ListPasskeys,
  method: HttpMethod.Get,
  path: '/v1/me/passkeys',
  request: PageQuerySchema,
  response: PasskeyPageSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Lista las passkeys registradas del usuario.',
});

/** `POST /v1/me/passkeys/registration-options`: opciones para registrar una passkey. Exige MFA reciente. */
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
  description: 'Crea el desafío para registrar una passkey nueva.',
});

/** `POST /v1/me/passkeys`: registra la passkey con la respuesta del autenticador. */
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
  description: 'Registra una passkey nueva con la respuesta del autenticador.',
});

/** `DELETE /v1/me/passkeys/{passkeyId}`: quita una passkey. Exige MFA reciente. */
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
  description: 'Quita una passkey de la cuenta.',
});
