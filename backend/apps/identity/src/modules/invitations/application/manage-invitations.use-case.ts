import { Injectable } from '@nestjs/common';
import type { InvitationPage } from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { InvitationRepository } from '../domain/invitation.repository.js';
import { InvitationView } from './invitation-view.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';

/** Invitaciones del tenant: listar y revocar. */
@Injectable()
export class ManageInvitations {
  constructor(
    private readonly invitations: InvitationRepository,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async list(tenantId: string): Promise<InvitationPage> {
    const invitations = await this.scopes.inTenantShard(tenantId, () =>
      this.invitations.list(),
    );
    const now = this.clock.now();
    return {
      items: invitations.map((invitation) =>
        InvitationView.of(invitation, now),
      ),
      nextCursor: null,
    };
  }

  async revoke(tenantId: string, invitationId: string): Promise<void> {
    await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const invitation = await this.invitations.find(invitationId);
        if (invitation === undefined) {
          throw IdentityError.notFound();
        }
        if (invitation.revoke(this.clock.now())) {
          await this.invitations.update(invitation);
        }
      }),
    );
  }
}
