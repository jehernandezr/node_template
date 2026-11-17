import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  AuthMethodReference,
  SessionTokens,
} from '@contracts/identity';
import { TransactionManager } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { SessionRef } from '../domain/session-ref.js';
import { SessionRepository } from '../domain/session.repository.js';
import { SessionTokenIssuer } from './session-token-issuer.js';

/** Sube el último MFA de la sesión (step-up) y emite un access token nuevo; el session token no cambia. */
@Injectable()
export class MarkMfaVerified {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly issuer: SessionTokenIssuer,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  async execute(
    ref: SessionRef,
    at: Date,
    amr: readonly AuthMethodReference[],
  ): Promise<SessionTokens> {
    const user = { userId: ref.userId, homeTenantId: ref.homeTenantId };
    const session = await this.scopes.inUserShard(user, () =>
      this.transactions.runInTransaction(async () => {
        const found = await this.sessions.find(ref.userId, ref.sessionId);
        if (found === undefined || found.isRevoked()) {
          throw new IdentityError(IdentityErrorCode.SessionRevoked);
        }
        found.markMfaVerified(at, amr);
        await this.sessions.update(found);
        return found;
      }),
    );
    const access = await this.issuer.accessToken(session);
    return {
      accessToken: access.accessToken,
      accessExpiresAt: access.accessExpiresAt.toISOString(),
    };
  }
}
