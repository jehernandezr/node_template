import {
  Access,
  defineRoute,
  HttpMethod,
  PageQuerySchema,
  PlatformErrorCode,
} from '@contracts/platform';
import { Permission } from '../enums/access.enum.js';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  AcceptInvitationRequestSchema,
  InvitationPageSchema,
  InvitationSummarySchema,
  InviteUserRequestSchema,
  RevokeInvitationRequestSchema,
} from '../schemas/invitation.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/** `POST /v1/tenant/invitations`: invita a un email a unirse al tenant. */
export const InviteUserRoute = defineRoute({
  id: IdentityRoute.InviteUser,
  method: HttpMethod.Post,
  path: '/v1/tenant/invitations',
  request: InviteUserRequestSchema,
  response: InvitationSummarySchema,
  successStatus: 201,
  errors: [...SessionGuardErrors, PlatformErrorCode.AuthForbidden],
  access: Access.authenticated({
    permissions: [Permission.IdentityInvitationsManage],
  }),
  description: 'Invita a un email a unirse al tenant en los grupos indicados.',
});

/** `GET /v1/tenant/invitations`: invitaciones del tenant. */
export const ListInvitationsRoute = defineRoute({
  id: IdentityRoute.ListInvitations,
  method: HttpMethod.Get,
  path: '/v1/tenant/invitations',
  request: PageQuerySchema,
  response: InvitationPageSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.AuthForbidden],
  access: Access.authenticated({
    permissions: [Permission.IdentityInvitationsManage],
  }),
  description: 'Lista las invitaciones del tenant con su estado.',
});

/** `DELETE /v1/tenant/invitations/{invitationId}`: revoca una invitación pendiente. */
export const RevokeInvitationRoute = defineRoute({
  id: IdentityRoute.RevokeInvitation,
  method: HttpMethod.Delete,
  path: '/v1/tenant/invitations/{invitationId}',
  request: RevokeInvitationRequestSchema,
  errors: [
    ...SessionGuardErrors,
    PlatformErrorCode.AuthForbidden,
    IdentityErrorCode.InvitationInvalid,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityInvitationsManage],
  }),
  description: 'Revoca una invitación pendiente.',
});

/** `POST /v1/invitations/accept`: acepta una invitación con la sesión del usuario invitado. */
export const AcceptInvitationRoute = defineRoute({
  id: IdentityRoute.AcceptInvitation,
  method: HttpMethod.Post,
  path: '/v1/invitations/accept',
  request: AcceptInvitationRequestSchema,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.InvitationInvalid,
    IdentityErrorCode.InvitationEmailMismatch,
    IdentityErrorCode.AuthEmailNotVerified,
  ],
  access: Access.authenticated(),
  description:
    'Acepta una invitación. El email de la sesión debe ser el invitado y estar verificado.',
});
