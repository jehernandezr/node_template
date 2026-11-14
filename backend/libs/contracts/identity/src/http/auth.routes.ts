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

/** `POST /v1/auth/sign-in`: email y contraseña. Puede pedir un segundo factor. */
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
    'Inicia sesión con email y contraseña. Responde tokens o un desafío MFA.',
});

/**
 * `POST /v1/auth/mfa/challenges`: pide un desafío con uno de los métodos que
 * ofreció el inicio de sesión. Con un dispositivo registrado, el código aparece
 * en su app; si es el primer dispositivo, llega por email.
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
    'Crea un desafío MFA para el login pendiente y envía el código por el método elegido.',
});

/** `POST /v1/auth/mfa/verify`: verifica el desafío y crea la sesión. */
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
    'Verifica un desafío MFA, crea la sesión y registra el dispositivo nuevo.',
});

/**
 * `POST /v1/auth/refresh`: rota el session token y emite un access token
 * nuevo. En móvil el session token viaja en el cuerpo y la respuesta trae el
 * siguiente; en web viaja en la cookie `httpOnly`, el servidor la reemplaza con
 * `Set-Cookie` y la respuesta no trae `sessionToken`. Presentar un session
 * token ya rotado revoca la sesión completa.
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
    'Rota el session token (cuerpo en móvil, cookie httpOnly en web) y emite un access token nuevo.',
});

/**
 * `POST /v1/auth/sign-out`: cierra la sesión del session token (cuerpo en
 * móvil, cookie en web), revoca sus tokens y borra la cookie. Es idempotente:
 * una sesión que ya no existe responde igual.
 */
export const SignOutRoute = defineRoute({
  id: IdentityRoute.SignOut,
  method: HttpMethod.Post,
  path: '/v1/auth/sign-out',
  request: SessionTokenRequestSchema,
  errors: [PlatformErrorCode.RateLimitExceeded],
  access: Access.public(),
  description:
    'Cierra la sesión del session token, revoca sus tokens y borra la cookie en web.',
});
