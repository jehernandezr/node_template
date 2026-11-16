import { Endpoint, Resource } from '@platform/http/nest';
import {
  InviteUserRoute,
  ListInvitationsRoute,
  RevokeInvitationRoute,
  AcceptInvitationRoute,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Invitations)
export class InvitationsController {
  @Endpoint(InviteUserRoute)
  inviteUser(): never {
    throw new RouteNotImplementedError(InviteUserRoute.id);
  }

  @Endpoint(ListInvitationsRoute)
  listInvitations(): never {
    throw new RouteNotImplementedError(ListInvitationsRoute.id);
  }

  @Endpoint(RevokeInvitationRoute)
  revokeInvitation(): never {
    throw new RouteNotImplementedError(RevokeInvitationRoute.id);
  }

  @Endpoint(AcceptInvitationRoute)
  acceptInvitation(): never {
    throw new RouteNotImplementedError(AcceptInvitationRoute.id);
  }
}
