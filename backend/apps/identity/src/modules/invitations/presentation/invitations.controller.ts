import { ActingMember, ActingUser } from '@platform/auth';
import { RateLimitTier } from '@platform/http';
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
import { AcceptInvitation } from '../application/accept-invitation.use-case.js';
import { InviteUser } from '../application/invite-user.use-case.js';
import { ManageInvitations } from '../application/manage-invitations.use-case.js';

/** HTTP edge of the invitations of the active tenant. */
@Resource(IdentityResource.Invitations)
export class InvitationsController {
  constructor(
    private readonly invite: InviteUser,
    private readonly manage: ManageInvitations,
    private readonly accept: AcceptInvitation,
  ) {}

  /**
   * Invites a person into the active tenant with groups the caller can grant.
   * @param input Email and groups.
   * @param actor Caller.
   * @returns The invitation.
   */
  @Endpoint(InviteUserRoute, { rateLimit: RateLimitTier.Sensitive })
  inviteUser(
    @Input() input: InviteUserRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<InvitationSummary> {
    return this.invite.execute(ActingMember.of(actor).tenantId, actor, input);
  }

  /**
   * Lists the invitations of the active tenant.
   * @param actor Caller.
   * @returns The invitations.
   */
  @Endpoint(ListInvitationsRoute)
  listInvitations(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<InvitationPage> {
    return this.manage.list(ActingMember.of(actor).tenantId);
  }

  /**
   * Revokes a pending invitation.
   * @param input Invitation to revoke.
   * @param actor Caller.
   */
  @Endpoint(RevokeInvitationRoute)
  async revokeInvitation(
    @Input() input: RevokeInvitationRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.manage.revoke(
      ActingMember.of(actor).tenantId,
      input.invitationId,
    );
  }

  /**
   * Accepts an invitation with the caller's session.
   * @param input Emailed token.
   * @param actor Caller.
   */
  @Endpoint(AcceptInvitationRoute)
  async acceptInvitation(
    @Input() input: AcceptInvitationRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.accept.execute(
      ActingUser.refOf(ActingUser.of(actor)),
      input.token,
    );
  }
}
