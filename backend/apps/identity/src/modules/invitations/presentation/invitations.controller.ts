import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import type { Actor } from '@platform/auth';
import {
  InviteUserRoute,
  ListInvitationsRoute,
  RevokeInvitationRoute,
  AcceptInvitationRoute,
  type AcceptInvitationRequest,
  type InvitationPage,
  type InvitationSummary,
  type InviteUserRequest,
  type RevokeInvitationRequest,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import {
  requireUserActor,
  tenantOfActor,
  userRefOf,
} from '../../../shared/utils/user-actor.js';
import { AcceptInvitation } from '../application/accept-invitation.use-case.js';
import { InviteUser } from '../application/invite-user.use-case.js';
import { ManageInvitations } from '../application/manage-invitations.use-case.js';

@Resource(IdentityResource.Invitations)
export class InvitationsController {
  constructor(
    private readonly invite: InviteUser,
    private readonly manage: ManageInvitations,
    private readonly accept: AcceptInvitation,
  ) {}

  @Endpoint(InviteUserRoute)
  inviteUser(
    @Input() input: InviteUserRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<InvitationSummary> {
    return this.invite.execute(tenantOfActor(actor), actor, input);
  }

  @Endpoint(ListInvitationsRoute)
  listInvitations(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<InvitationPage> {
    return this.manage.list(tenantOfActor(actor));
  }

  @Endpoint(RevokeInvitationRoute)
  async revokeInvitation(
    @Input() input: RevokeInvitationRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.manage.revoke(tenantOfActor(actor), input.invitationId);
  }

  @Endpoint(AcceptInvitationRoute)
  async acceptInvitation(
    @Input() input: AcceptInvitationRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.accept.execute(userRefOf(requireUserActor(actor)), input.token);
  }
}
