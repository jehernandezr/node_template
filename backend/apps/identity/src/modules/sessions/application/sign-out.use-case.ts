import { Injectable } from '@nestjs/common';
import { RevocationReason } from '@contracts/identity';
import { Clock, TransactionManager, UseCase } from '@platform/kernel';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { SessionRepository } from '../domain/session.repository.js';
import { SessionToken } from '../domain/session-token.js';
import { GenerationMatch } from '../domain/session.js';
import { SessionRevoker } from './session-revoker.js';
import { SessionTokenIssuer } from './session-token-issuer.js';

/**
 * Cierra la sesión del session token. Es idempotente: un token mal formado, de una sesión que no existe o
 * ya cerrada responde igual, sin revelar nada.
 */
@Injectable()
export class SignOut implements UseCase<string | undefined, void> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly issuer: SessionTokenIssuer,
    private readonly revoker: SessionRevoker,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(text: string | undefined): Promise<void> {
    const token = text === undefined ? undefined : SessionToken.parse(text);
    if (token === undefined) {
      return;
    }
    const ref = { userId: token.userId, homeTenantId: token.homeTenantId };
    await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const session = await this.sessions.find(token.userId, token.sessionId);
        const genuine =
          session !== undefined &&
          session.classify(
            token.generation,
            (generation) =>
              this.issuer.matches(session, generation, token.secret),
            this.clock.now(),
          ) !== GenerationMatch.Unknown;
        if (session !== undefined && genuine) {
          await this.revoker.revoke(session, RevocationReason.Logout);
        }
      }),
    );
  }
}
