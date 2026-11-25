import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import type { InvitationSummary, InviteUserRequest } from '@contracts/identity';
import { ActorGuards, type Actor } from '@platform/auth';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { normalizeEmail } from '../../../shared/utils/email-normalization.js';
import { AccessFacade } from '../../access/index.js';
import { IdentityMailer } from '../../alerts/index.js';
import { TenantsFacade } from '../../tenants/index.js';
import { InvitationRepository } from '../domain/invitation.repository.js';
import { InvitationToken } from '../domain/invitation-token.js';
import { Invitation } from '../domain/invitation.js';
import { InvitationView } from './invitation-view.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';

/**
 * Invites an email to the tenant with some groups and sends it the link with the token. The groups cannot grant
 * a permission the inviter does not have: accepting the invitation grants them as they are.
 */
@Injectable()
export class InviteUser {
  private static readonly SECRET_BYTES = 32;

  constructor(
    private readonly invitations: InvitationRepository,
    private readonly tenants: TenantsFacade,
    private readonly access: AccessFacade,
    private readonly mailer: IdentityMailer,
    private readonly generator: SecretGenerator,
    private readonly hasher: SecretHasher,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(
    tenantId: string,
    actor: Actor | undefined,
    request: InviteUserRequest,
  ): Promise<InvitationSummary> {
    const invitedBy = this.inviterOf(actor);
    const groupIds = [...new Set(request.groupIds)];
    await this.access.assertCanGrantGroups(tenantId, actor, groupIds);
    const tenant = await this.tenants.get(tenantId);
    const now = this.clock.now();
    const token = new InvitationToken(
      tenantId,
      this.generator.bytes(InviteUser.SECRET_BYTES),
    );
    const invitation = Invitation.issue({
      id: this.ids.next().toString(),
      tenantId,
      email: normalizeEmail(request.email),
      groupIds,
      invitedBy,
      tokenHash: this.hasher.digest(token.secret),
      expiresAt: new Date(now.getTime() + IdentityDefaults.invitationTtlMs),
    });
    await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(() =>
        this.invitations.insert(invitation),
      ),
    );
    await this.mailer.send({
      template: IdentityEmailTemplate.TenantInvitation,
      to: invitation.snapshot().email,
      variables: { token: token.format(), tenantName: tenant.name },
    });
    return InvitationView.of(invitation, now);
  }

  /** @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` if the inviter is neither a user nor a service account. */
  private inviterOf(actor: Actor | undefined): string {
    if (actor !== undefined && ActorGuards.isUser(actor)) {
      return actor.userId;
    }
    if (actor !== undefined && ActorGuards.isServiceAccount(actor)) {
      return actor.serviceAccountId;
    }
    throw IdentityError.forbidden([]);
  }
}
