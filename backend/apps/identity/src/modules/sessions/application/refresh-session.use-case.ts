import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  RevocationReason,
  UserStatus,
  SessionTokens,
} from '@contracts/identity';
import { AuthenticationError } from '@platform/auth';
import { Clock, TransactionManager, UseCase } from '@platform/kernel';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { TenantsFacade } from '../../tenants/index.js';
import { UsersFacade } from '../../users/index.js';
import { GenerationMatch, Session } from '../domain/session.js';
import { SessionRepository } from '../domain/session.repository.js';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { SessionToken } from '../domain/session-token.js';
import { SessionRevoker } from './session-revoker.js';
import { SessionTokenIssuer } from './session-token-issuer.js';

/** Resultado de la transacción del refresh: la sesión y, si rotó, su session token nuevo. */
interface RefreshOutcome {
  readonly session: Session;
  readonly sessionToken?: string;
  readonly reused: boolean;
}

/**
 * Rota el session token y emite un access token nuevo. Un token de la generación anterior dentro de la
 * gracia recibe un access token sin rotar (dos pestañas a la vez); fuera de ella, revoca la sesión. Una
 * generación cuyo secreto no se verifica responde como un token desconocido y no toca la sesión.
 */
@Injectable()
export class RefreshSession implements UseCase<
  string | undefined,
  SessionTokens
> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly issuer: SessionTokenIssuer,
    private readonly revoker: SessionRevoker,
    private readonly users: UsersFacade,
    private readonly tenants: TenantsFacade,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  async execute(text: string | undefined): Promise<SessionTokens> {
    const token = text === undefined ? undefined : SessionToken.parse(text);
    if (token === undefined) {
      throw AuthenticationError.unauthenticated('missing session token');
    }
    const ref = { userId: token.userId, homeTenantId: token.homeTenantId };
    const outcome = await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(() => this.rotate(token)),
    );
    if (outcome.reused) {
      throw new IdentityError(IdentityErrorCode.SessionReused);
    }
    const user = await this.users.getByRef(ref);
    if (user.status === UserStatus.Suspended) {
      throw new IdentityError(IdentityErrorCode.UserSuspended);
    }
    await this.tenants.assertActive(outcome.session.snapshot().activeTenantId);
    const access = await this.issuer.accessToken(outcome.session);
    return {
      accessToken: access.accessToken,
      accessExpiresAt: access.accessExpiresAt.toISOString(),
      ...(outcome.sessionToken === undefined
        ? {}
        : { sessionToken: outcome.sessionToken }),
    };
  }

  private async rotate(token: SessionToken): Promise<RefreshOutcome> {
    const session = await this.sessions.findForUpdate(
      token.userId,
      token.sessionId,
    );
    if (session === undefined) {
      throw AuthenticationError.unauthenticated('unknown session');
    }
    const now = this.clock.now();
    if (session.isRevoked()) {
      throw new IdentityError(IdentityErrorCode.SessionRevoked);
    }
    if (session.isExpired(now)) {
      throw new IdentityError(IdentityErrorCode.SessionExpired);
    }
    switch (
      session.classify(
        token.generation,
        (generation) => this.issuer.matches(session, generation, token.secret),
        now,
      )
    ) {
      case GenerationMatch.Unknown:
        throw AuthenticationError.unauthenticated('unknown session token');
      case GenerationMatch.Reused:
        await this.revoker.revoke(session, RevocationReason.Compromised);
        return { session, reused: true };
      case GenerationMatch.Grace:
        return { session, reused: false };
      case GenerationMatch.Current: {
        session.rotate(
          now,
          IdentityDefaults.refreshGraceMs,
          this.settings.values.SESSION_IDLE_TTL,
        );
        await this.sessions.update(session);
        return {
          session,
          sessionToken: this.issuer.sessionToken(session),
          reused: false,
        };
      }
    }
  }
}
