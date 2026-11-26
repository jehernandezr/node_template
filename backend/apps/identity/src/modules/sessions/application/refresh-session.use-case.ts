import { ShardScopes } from '@platform/persistence';
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
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { TenantsFacade } from '../../tenants/index.js';
import { UsersFacade } from '../../users/index.js';
import { GenerationMatch, Session } from '../domain/session.js';
import { SessionRepository } from '../domain/session.repository.js';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { SessionToken } from '../domain/session-token.js';
import { SessionRevoker } from './session-revoker.js';
import { SessionTokenIssuer } from './session-token-issuer.js';

/** Result of the refresh transaction: the session token to hand out, or that the token was reused. */
interface RefreshOutcome {
  readonly sessionToken?: string;
  readonly reused: boolean;
}

/**
 * Rotates the session token and issues a new access token. The user, the tenant and the access token are
 * checked and signed before the rotation commits: a failure after rotating would leave the client without
 * the new generation, and its retry would revoke the session as theft. A token of the previous generation
 * within the grace receives the current session token without rotating again (two tabs, or a retry after a
 * lost answer); outside of it, it revokes the session. A generation whose secret does not verify answers as
 * an unknown token and does not touch the session.
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
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  /**
   * Trades a session token for a new access token and the next session token, revoking the session on reuse.
   * @param text Session token presented by the client.
   * @returns The new access token and, unless the web cookie carries it, the current session token.
   * @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` for an unknown or malformed token.
   * @throws IdentityError `IDENTITY.SESSION.REUSED` if a rotated token comes back after the grace.
   * @throws IdentityError `IDENTITY.SESSION.REVOKED`, `IDENTITY.SESSION.EXPIRED`, `IDENTITY.USER.SUSPENDED`
   *   or `IDENTITY.TENANT.SUSPENDED` when the session can no longer be used.
   */
  async execute(text: string | undefined): Promise<SessionTokens> {
    const token = text === undefined ? undefined : SessionToken.parse(text);
    if (token === undefined) {
      throw AuthenticationError.unauthenticated('missing session token');
    }
    const ref = { userId: token.userId, homeTenantId: token.homeTenantId };
    const current = await this.scopes.inUserShard(ref, () =>
      this.sessions.find(token.userId, token.sessionId),
    );
    if (current === undefined) {
      throw AuthenticationError.unauthenticated('unknown session');
    }
    await this.assertUsable(ref, current);
    const access = await this.issuer.accessToken(current);
    const outcome = await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(() => this.rotate(token, current)),
    );
    if (outcome.reused) {
      throw new IdentityError(IdentityErrorCode.SessionReused);
    }
    return {
      accessToken: access.accessToken,
      accessExpiresAt: access.accessExpiresAt.toISOString(),
      ...(outcome.sessionToken === undefined
        ? {}
        : { sessionToken: outcome.sessionToken }),
    };
  }

  private async assertUsable(ref: UserRef, session: Session): Promise<void> {
    const user = await this.users.getByRef(ref);
    if (user.status === UserStatus.Suspended) {
      throw new IdentityError(IdentityErrorCode.UserSuspended);
    }
    if (user.status === UserStatus.Deleted) {
      throw new IdentityError(IdentityErrorCode.SessionRevoked);
    }
    await this.tenants.assertActive(session.snapshot().activeTenantId);
  }

  private async rotate(
    token: SessionToken,
    signed: Session,
  ): Promise<RefreshOutcome> {
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
    if (
      session.snapshot().activeTenantId !== signed.snapshot().activeTenantId
    ) {
      throw AuthenticationError.unauthenticated('session changed tenant');
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
        return { reused: true };
      case GenerationMatch.Grace:
        return {
          sessionToken: this.issuer.sessionToken(session),
          reused: false,
        };
      case GenerationMatch.Current: {
        session.rotate(
          now,
          IdentityDefaults.refreshGraceMs,
          this.settings.values.SESSION_IDLE_TTL,
        );
        await this.sessions.update(session);
        return {
          sessionToken: this.issuer.sessionToken(session),
          reused: false,
        };
      }
    }
  }
}
