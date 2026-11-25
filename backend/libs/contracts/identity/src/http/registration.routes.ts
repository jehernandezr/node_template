import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import {
  BillingReference,
  IdentityErrorCode,
  IdentityRoute,
} from '../enums/identifiers.enum.js';
import {
  EmailVerificationConfirmRequestSchema,
  EmailVerificationRequestSchema,
  SignUpRequestSchema,
} from '../schemas/user.schema.js';

/** `POST /v1/auth/sign-up`: user registration. The response does not reveal whether the email already exists. */
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
    BillingReference.QuotaExceeded,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Registers a user and sends the verification email. Responds accepted without revealing whether the email already exists.',
});

/** `POST /v1/auth/email-verifications`: requests another verification email. */
export const ResendEmailVerificationRoute = defineRoute({
  id: IdentityRoute.ResendEmailVerification,
  method: HttpMethod.Post,
  path: '/v1/auth/email-verifications',
  request: EmailVerificationRequestSchema,
  successStatus: 202,
  errors: [PlatformErrorCode.RateLimitExceeded],
  access: Access.public(),
  description:
    'Sends a new verification email. Responds accepted even if the email does not exist.',
});

/** `POST /v1/auth/email-verifications/confirm`: verifies the email with the received token. */
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
  description: 'Marks the user email as verified with the received token.',
});
