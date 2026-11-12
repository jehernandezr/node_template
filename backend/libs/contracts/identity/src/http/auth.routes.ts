import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  MfaVerifyRequestSchema,
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
