import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  MfaChallengeRequestSchema,
  MfaChallengeSchema,
  PendingMfaSchema,
  StepUpResultSchema,
  StepUpVerifyRequestSchema,
} from '../schemas/auth.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/**
 * `POST /v1/me/step-up`: abre el paso adicional de la sesión actual. Responde
 * un `mfaToken` atado a la sesión y los métodos que ofrece; con un dispositivo
 * registrado, el email deja de ofrecerse.
 */
export const StartStepUpRoute = defineRoute({
  id: IdentityRoute.StartStepUp,
  method: HttpMethod.Post,
  path: '/v1/me/step-up',
  response: PendingMfaSchema,
  successStatus: 201,
  errors: [...SessionGuardErrors, PlatformErrorCode.RateLimitExceeded],
  access: Access.authenticated(),
  description:
    'Abre el paso adicional (step-up) de la sesión actual y devuelve los métodos que ofrece.',
});

/**
 * `POST /v1/me/step-up/challenges`: crea el desafío del paso adicional con uno
 * de los métodos ofrecidos, con las mismas reglas que el desafío del login.
 */
export const RequestStepUpChallengeRoute = defineRoute({
  id: IdentityRoute.RequestStepUpChallenge,
  method: HttpMethod.Post,
  path: '/v1/me/step-up/challenges',
  request: MfaChallengeRequestSchema,
  response: MfaChallengeSchema,
  successStatus: 201,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaTokenInvalid,
    IdentityErrorCode.MfaMethodUnavailable,
    IdentityErrorCode.MfaTooManyAttempts,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.authenticated(),
  description:
    'Crea el desafío del paso adicional y envía el código por el método elegido.',
});

/**
 * `POST /v1/me/step-up/verify`: verifica el desafío, actualiza el
 * `mfaVerifiedAt` de la sesión y emite un access token nuevo con `auth_time`
 * y `amr` al día. El session token no cambia.
 */
export const VerifyStepUpRoute = defineRoute({
  id: IdentityRoute.VerifyStepUp,
  method: HttpMethod.Post,
  path: '/v1/me/step-up/verify',
  request: StepUpVerifyRequestSchema,
  response: StepUpResultSchema,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaTokenInvalid,
    IdentityErrorCode.MfaCodeInvalid,
    IdentityErrorCode.MfaCodeExpired,
    IdentityErrorCode.MfaTooManyAttempts,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.authenticated(),
  description:
    'Verifica el paso adicional, actualiza el último MFA de la sesión y emite un access token nuevo.',
});
