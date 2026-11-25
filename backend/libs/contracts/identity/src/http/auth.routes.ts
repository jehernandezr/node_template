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
  MfaVerifyRequestSchema,
  SessionTokenRequestSchema,
  SessionTokensSchema,
  SignInRequestSchema,
  SignInResponseSchema,
} from '../schemas/auth.schema.js';

/** `POST /v1/auth/sign-in`: email and password. May require a second factor. */
export const SignInRoute = defineRoute({
  id: IdentityRoute.SignIn,
  method: HttpMethod.Post,
  path: '/v1/auth/sign-in',
  request: SignInRequestSchema,
  response: SignInResponseSchema,
  errors: [
    IdentityErrorCode.AuthInvalidCredentials,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Signs in with email and password. Responds with tokens or an MFA challenge.',
});

/**
 * `POST /v1/auth/mfa/challenges`: requests a challenge with one of the methods
 * the sign-in offered. With a registered device, the code appears
 * in its app; if it is the first device, it arrives by email.
 */
export const RequestMfaChallengeRoute = defineRoute({
  id: IdentityRoute.RequestMfaChallenge,
  method: HttpMethod.Post,
  path: '/v1/auth/mfa/challenges',
  request: MfaChallengeRequestSchema,
  response: MfaChallengeSchema,
  successStatus: 201,
  errors: [
    IdentityErrorCode.MfaTokenInvalid,
    IdentityErrorCode.MfaMethodUnavailable,
    IdentityErrorCode.MfaTooManyAttempts,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Creates an MFA challenge for the pending login and sends the code through the chosen method.',
});

/** `POST /v1/auth/mfa/verify`: verifies the challenge and creates the session. */
export const VerifyMfaRoute = defineRoute({
  id: IdentityRoute.VerifyMfa,
  method: HttpMethod.Post,
  path: '/v1/auth/mfa/verify',
  request: MfaVerifyRequestSchema,
  response: SignInResponseSchema,
  errors: [
    IdentityErrorCode.MfaTokenInvalid,
    IdentityErrorCode.MfaCodeInvalid,
    IdentityErrorCode.MfaCodeExpired,
    IdentityErrorCode.MfaTooManyAttempts,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Verifies an MFA challenge, creates the session and registers the new device.',
});

/**
 * `POST /v1/auth/refresh`: rotates the session token and issues a new access
 * token. On mobile the session token travels in the body and the response carries the
 * next one; on web it travels in the `httpOnly` cookie, the server replaces it with
 * `Set-Cookie` and the response does not carry `sessionToken`. Presenting an already
 * rotated session token revokes the whole session.
 */
export const RefreshSessionRoute = defineRoute({
  id: IdentityRoute.RefreshSession,
  method: HttpMethod.Post,
  path: '/v1/auth/refresh',
  request: SessionTokenRequestSchema,
  response: SessionTokensSchema,
  errors: [
    PlatformErrorCode.AuthUnauthenticated,
    IdentityErrorCode.SessionRevoked,
    IdentityErrorCode.SessionExpired,
    IdentityErrorCode.SessionReused,
    IdentityErrorCode.UserSuspended,
    IdentityErrorCode.TenantSuspended,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Rotates the session token (body on mobile, httpOnly cookie on web) and issues a new access token.',
});

/**
 * `POST /v1/auth/sign-out`: closes the session of the session token (body on
 * mobile, cookie on web), revokes its tokens and clears the cookie. It is idempotent:
 * a session that no longer exists gets the same response.
 */
export const SignOutRoute = defineRoute({
  id: IdentityRoute.SignOut,
  method: HttpMethod.Post,
  path: '/v1/auth/sign-out',
  request: SessionTokenRequestSchema,
  errors: [PlatformErrorCode.RateLimitExceeded],
  access: Access.public(),
  description:
    'Closes the session of the session token, revokes its tokens and clears the cookie on web.',
});
