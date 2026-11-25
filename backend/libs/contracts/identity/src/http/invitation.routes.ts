import {
  Access,
  defineRoute,
  HttpMethod,
  PageQuerySchema,
  PlatformErrorCode,
} from '@contracts/platform';
import { MfaRules } from '../constants/identity.constants.js';
import { Permission } from '../enums/access.enum.js';
import {
  BillingReference,
  IdentityErrorCode,
  IdentityRoute,
} from '../enums/identifiers.enum.js';
import {
  AcceptInvitationRequestSchema,
  InvitationPageSchema,
  InvitationSummarySchema,
  InviteUserRequestSchema,
  RevokeInvitationRequestSchema,
} from '../schemas/invitation.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/** `POST /v1/tenant/invitations`: invites an email to join the tenant. Requires a recent MFA. */
export const InviteUserRoute = defineRoute({
  id: IdentityRoute.InviteUser,
  method: HttpMethod.Post,
  path: '/v1/tenant/invitations',
  request: InviteUserRequestSchema,
  response: InvitationSummarySchema,
  successStatus: 201,
  errors: [
    ...SessionGuardErrors,
    PlatformErrorCode.AuthForbidden,
    IdentityErrorCode.MfaStepUpRequired,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityInvitationsManage],
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Invites an email to join the tenant in the given groups.',
});

/** `GET /v1/tenant/invitations`: invitations of the tenant. */
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
  description: 'Lists the invitations of the tenant with their status.',
});

/** `DELETE /v1/tenant/invitations/{invitationId}`: revokes a pending invitation. */
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
  description: 'Revokes a pending invitation.',
});

/** `POST /v1/invitations/accept`: accepts an invitation with the session of the invited user. */
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
    BillingReference.QuotaExceeded,
  ],
  access: Access.authenticated(),
  description:
    'Accepts an invitation. The email of the session must be the invited one and verified, its inviter must still be able to grant its groups, and the plan of the tenant must have a seat.',
});
