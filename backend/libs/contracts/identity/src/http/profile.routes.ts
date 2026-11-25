import { Access, defineRoute, HttpMethod } from '@contracts/platform';
import { MfaRules } from '../constants/identity.constants.js';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  EmailChangeConfirmRequestSchema,
  EmailChangeRequestSchema,
  UpdateProfileRequestSchema,
  UserProfileSchema,
} from '../schemas/user.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/** `GET /v1/me`: profile of the authenticated user. */
export const GetProfileRoute = defineRoute({
  id: IdentityRoute.GetProfile,
  method: HttpMethod.Get,
  path: '/v1/me',
  response: UserProfileSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Returns the profile of the authenticated user.',
});

/** `PATCH /v1/me`: changes the profile name or language. */
export const UpdateProfileRoute = defineRoute({
  id: IdentityRoute.UpdateProfile,
  method: HttpMethod.Patch,
  path: '/v1/me',
  request: UpdateProfileRequestSchema,
  response: UserProfileSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description:
    'Changes the profile name or language and returns the new profile.',
});

/**
 * `POST /v1/me/email-changes`: sends the token to the new address. Requires recent
 * MFA because email is the account recovery channel.
 */
export const RequestEmailChangeRoute = defineRoute({
  id: IdentityRoute.RequestEmailChange,
  method: HttpMethod.Post,
  path: '/v1/me/email-changes',
  request: EmailChangeRequestSchema,
  successStatus: 202,
  errors: [...SessionGuardErrors, IdentityErrorCode.MfaStepUpRequired],
  access: Access.authenticated({
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Sends a token to the new address to confirm the email change.',
});

/** `POST /v1/me/email-changes/confirm`: applies the email change with the received token. */
export const ConfirmEmailChangeRoute = defineRoute({
  id: IdentityRoute.ConfirmEmailChange,
  method: HttpMethod.Post,
  path: '/v1/me/email-changes/confirm',
  request: EmailChangeConfirmRequestSchema,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.UserEmailVerificationInvalid,
  ],
  access: Access.authenticated(),
  description:
    'Applies the email change with the token sent to the new address.',
});
