import { Injectable } from '@nestjs/common';
import { IdentityErrorCode } from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { AccessFacade } from '../../access/index.js';
import { UsersFacade } from '../../users/index.js';
import type { InvitationPreview } from '../domain/invitation-preview.js';
import { InvitationRepository } from '../domain/invitation.repository.js';
import { InvitationToken } from '../domain/invitation-token.js';
import type { Invitation } from '../domain/invitation.js';

/**
 * Acepta invitaciones. Aceptar exige un email verificado igual al invitado.
 */
@Injectable()
export class AcceptInvitation {
  constructor(
    private readonly invitations: InvitationRepository,
    private readonly access: AccessFacade,
    private readonly users: UsersFacade,
    private readonly hasher: SecretHasher,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  /** Acepta con la cuenta de la sesión. */
  async execute(user: UserRef, text: string): Promise<void> {
    const snapshot = await this.users.getByRef(user);
    if (snapshot.emailVerifiedAt === undefined) {
      throw new IdentityError(IdentityErrorCode.InvitationEmailMismatch);
    }
    await this.accept(text, user, snapshot.email);
  }

  /** Acepta para un usuario recién registrado: el token llegó a su email, que ya quedó verificado. */
  async forNewUser(text: string, user: UserRef): Promise<void> {
    const snapshot = await this.users.getByRef(user);
    await this.accept(text, user, snapshot.email);
  }

  async preview(text: string): Promise<InvitationPreview | undefined> {
    const token = InvitationToken.parse(text);
    if (token === undefined) {
      return undefined;
    }
    const invitation = await this.scopes
      .inTenantShard(token.tenantId, () =>
        this.invitations.findByTokenHash(this.hasher.digest(token.secret)),
      )
      .catch(() => undefined);
    if (invitation === undefined || !invitation.isUsable(this.clock.now())) {
      return undefined;
    }
    const state = invitation.snapshot();
    return {
      invitationId: state.id,
      tenantId: state.tenantId,
      email: state.email,
      groupIds: state.groupIds,
    };
  }

  /**
   * La membresía se agrega antes de marcar la invitación y fuera de su transacción, porque toca también el
   * shard del usuario. Si marcarla falla, un reintento encuentra la invitación pendiente y agregar el
   * miembro otra vez no cambia nada.
   */
  private async accept(
    text: string,
    user: UserRef,
    email: string,
  ): Promise<void> {
    const token = InvitationToken.parse(text);
    if (token === undefined) {
      throw new IdentityError(IdentityErrorCode.InvitationInvalid);
    }
    const invitation = await this.scopes.inTenantShard(token.tenantId, () =>
      this.usable(token),
    );
    if (invitation.snapshot().email !== email) {
      throw new IdentityError(IdentityErrorCode.InvitationEmailMismatch);
    }
    await this.access.addMember(
      token.tenantId,
      user,
      invitation.snapshot().groupIds,
    );
    await this.scopes.inTenantShard(token.tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const current = await this.usable(token);
        current.accept();
        await this.invitations.update(current);
      }),
    );
  }

  private async usable(token: InvitationToken): Promise<Invitation> {
    const invitation = await this.invitations.findByTokenHash(
      this.hasher.digest(token.secret),
    );
    if (invitation === undefined || !invitation.isUsable(this.clock.now())) {
      throw new IdentityError(IdentityErrorCode.InvitationInvalid);
    }
    return invitation;
  }
}
