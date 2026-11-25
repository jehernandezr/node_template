import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import { MfaRules } from '../constants/identity.constants.js';
import {
  ChangePasswordRequestSchema,
  PasswordResetConfirmRequestSchema,
  PasswordResetRequestSchema,
} from '../schemas/password.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/**
 * `POST /v1/me/password`: changes the password. Requires a recent MFA because
 * a stolen session must not be able to change it.
 */
export const ChangePasswordRoute = defineRoute({
  id: IdentityRoute.ChangePassword,
  method: HttpMethod.Post,
  path: '/v1/me/password',
  request: ChangePasswordRequestSchema,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.PasswordCurrentInvalid,
    IdentityErrorCode.PasswordPolicyViolation,
    IdentityErrorCode.PasswordBreached,
  ],
  access: Access.authenticated({
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description:
    'Changes the password and closes the other sessions of the user.',
});

/** `POST /v1/auth/password-resets`: sends the reset email. */
export const RequestPasswordResetRoute = defineRoute({
  id: IdentityRoute.RequestPasswordReset,
  method: HttpMethod.Post,
  path: '/v1/auth/password-resets',
  request: PasswordResetRequestSchema,
  successStatus: 202,
  errors: [PlatformErrorCode.RateLimitExceeded],
  access: Access.public(),
  description:
    'Sends the password reset email. Responds accepted even if the email does not exist.',
});

/** `POST /v1/auth/password-resets/confirm`: sets the new password with the token from the email. */
export const ConfirmPasswordResetRoute = defineRoute({
  id: IdentityRoute.ConfirmPasswordReset,
  method: HttpMethod.Post,
  path: '/v1/auth/password-resets/confirm',
  request: PasswordResetConfirmRequestSchema,
  errors: [
    IdentityErrorCode.PasswordResetInvalid,
    IdentityErrorCode.PasswordPolicyViolation,
    IdentityErrorCode.PasswordBreached,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Resets the password with the emailed token and closes the user sessions.',
});
