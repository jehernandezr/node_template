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
 * `POST /v1/me/step-up`: opens the step-up of the current session. Responds with
 * an `mfaToken` bound to the session and the methods it offers; with a registered
 * device, email is no longer offered.
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
    'Opens the step-up of the current session and returns the methods it offers.',
});

/**
 * `POST /v1/me/step-up/challenges`: creates the step-up challenge with one
 * of the offered methods, with the same rules as the login challenge.
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
    'Creates the step-up challenge and sends the code through the chosen method.',
});

/**
 * `POST /v1/me/step-up/verify`: verifies the challenge, updates the session's
 * `mfaVerifiedAt` and issues a new access token with up-to-date `auth_time`
 * and `amr`. The session token does not change.
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
    'Verifies the step-up, updates the last MFA of the session and issues a new access token.',
});
