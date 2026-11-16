import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  EmailVerificationConfirmRequestSchema,
  EmailVerificationRequestSchema,
  SignUpRequestSchema,
} from '../schemas/user.schema.js';

/** `POST /v1/auth/sign-up`: alta de usuario. La respuesta no revela si el email ya existe. */
export const SignUpRoute = defineRoute({
  id: IdentityRoute.SignUp,
  method: HttpMethod.Post,
  path: '/v1/auth/sign-up',
  request: SignUpRequestSchema,
  successStatus: 202,
  errors: [
    IdentityErrorCode.PasswordPolicyViolation,
    IdentityErrorCode.PasswordBreached,
    IdentityErrorCode.InvitationInvalid,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Registra un usuario y envía el email de verificación. Responde aceptado sin revelar si el email ya existe.',
});

/** `POST /v1/auth/email-verifications`: pide otro email de verificación. */
export const ResendEmailVerificationRoute = defineRoute({
  id: IdentityRoute.ResendEmailVerification,
  method: HttpMethod.Post,
  path: '/v1/auth/email-verifications',
  request: EmailVerificationRequestSchema,
  successStatus: 202,
  errors: [PlatformErrorCode.RateLimitExceeded],
  access: Access.public(),
  description:
    'Envía un nuevo email de verificación. Responde aceptado aunque el email no exista.',
});

/** `POST /v1/auth/email-verifications/confirm`: verifica el email con el token recibido. */
export const ConfirmEmailVerificationRoute = defineRoute({
  id: IdentityRoute.ConfirmEmailVerification,
  method: HttpMethod.Post,
  path: '/v1/auth/email-verifications/confirm',
  request: EmailVerificationConfirmRequestSchema,
  errors: [
    IdentityErrorCode.UserEmailVerificationInvalid,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Marca el email del usuario como verificado con el token recibido.',
});
