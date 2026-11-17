import { Injectable } from '@nestjs/common';
import { IdentityErrorCode, SessionTokens } from '@contracts/identity';
import { UserActor } from '@platform/auth';
import { TransactionManager, UseCase } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { AccessFacade } from '../../access/index.js';
import { TenantsFacade } from '../../tenants/index.js';
import { UsersFacade } from '../../users/index.js';
import { SessionRepository } from '../domain/session.repository.js';
import { SessionTokenIssuer } from './session-token-issuer.js';

/** Pedido de cambio de tenant de la sesión actual. */
export interface SwitchTenantInput {
  readonly actor: UserActor;
  readonly tenantId: string;
}

/** Cambia el tenant activo de la sesión y emite un access token con el `tid` y el `pv` del tenant nuevo. */
@Injectable()
export class SwitchTenant implements UseCase<SwitchTenantInput, SessionTokens> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly issuer: SessionTokenIssuer,
    private readonly access: AccessFacade,
    private readonly tenants: TenantsFacade,
    private readonly users: UsersFacade,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  async execute(input: SwitchTenantInput): Promise<SessionTokens> {
    const { actor, tenantId } = input;
    if (!(await this.access.isMember(actor.userId, tenantId))) {
      throw new IdentityError(IdentityErrorCode.TenantNotMember);
    }
    await this.tenants.assertActive(tenantId);
    const ref = { userId: actor.userId, homeTenantId: actor.homeTenantId };
    const session = await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const found = await this.sessions.find(actor.userId, actor.sessionId);
        if (found === undefined || found.isRevoked()) {
          throw new IdentityError(IdentityErrorCode.SessionRevoked);
        }
        found.switchTenant(tenantId);
        await this.sessions.update(found);
        return found;
      }),
    );
    await this.users.setLastTenant(ref, tenantId);
    const access = await this.issuer.accessToken(session);
    return {
      accessToken: access.accessToken,
      accessExpiresAt: access.accessExpiresAt.toISOString(),
    };
  }
}
