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

/** `GET /v1/me`: perfil del usuario autenticado. */
export const GetProfileRoute = defineRoute({
  id: IdentityRoute.GetProfile,
  method: HttpMethod.Get,
  path: '/v1/me',
  response: UserProfileSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Devuelve el perfil del usuario autenticado.',
});

/** `PATCH /v1/me`: cambia el nombre o el idioma del perfil. */
export const UpdateProfileRoute = defineRoute({
  id: IdentityRoute.UpdateProfile,
  method: HttpMethod.Patch,
  path: '/v1/me',
  request: UpdateProfileRequestSchema,
  response: UserProfileSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description:
    'Cambia el nombre o el idioma del perfil y devuelve el perfil nuevo.',
});

/**
 * `POST /v1/me/email-changes`: envía el token a la dirección nueva. Exige MFA
 * reciente porque el email es el canal de recuperación de la cuenta.
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
  description:
    'Envía un token a la dirección nueva para confirmar el cambio de email.',
});

/** `POST /v1/me/email-changes/confirm`: aplica el cambio de email con el token recibido. */
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
    'Aplica el cambio de email con el token enviado a la dirección nueva.',
});
