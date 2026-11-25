import { Injectable } from '@nestjs/common';
import {
  RevocationScope,
  SessionRevokedEvent,
  TokensRevokedEvent,
  RevocationReason,
} from '@contracts/identity';
import { AuthStateWriter } from '@platform/auth';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { SessionRepository } from '../domain/session.repository.js';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { Session } from '../domain/session.js';

/**
 * Revokes a session inside the open transaction: it marks the row, publishes `SessionRevoked` and
 * `TokensRevoked` through the outbox and, after the commit, writes `auth:revoked:{sid}` so the other services
 * reject its access token. `RevocationReplay` writes the mark again from the event if that write is lost.
 */
@Injectable()
export class SessionRevoker {
  /** The mark lasts what is left of the access token plus the clock tolerance of the verifier. */
  static readonly CLOCK_SKEW_MS = 30_000;

  constructor(
    private readonly sessions: SessionRepository,
    private readonly state: AuthStateWriter,
    private readonly bus: MessageBus,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  /**
   * Revokes a session.
   * @param session Session to revoke.
   * @param reason Why it is revoked.
   * @returns `false` if it was already revoked.
   */
  async revoke(session: Session, reason: RevocationReason): Promise<boolean> {
    const now = this.clock.now();
    if (!session.revoke(reason, now)) {
      return false;
    }
    await this.sessions.update(session);
    const state = session.snapshot();
    await this.bus.publish(
      SessionRevokedEvent,
      {
        sessionId: state.id,
        userId: state.userId,
        tenantId: state.activeTenantId,
        reason,
        revokedAt: now.toISOString(),
      },
      { tenantId: state.activeTenantId },
    );
    await this.bus.publish(
      TokensRevokedEvent,
      {
        scope: RevocationScope.Session,
        subjectId: state.id,
        revokedBefore: now.toISOString(),
      },
      { tenantId: state.activeTenantId },
    );
    const ttlMs =
      this.settings.values.ACCESS_TOKEN_TTL + SessionRevoker.CLOCK_SKEW_MS;
    this.transactions.afterCommit(() =>
      this.state.revokeSession(state.id, ttlMs, reason),
    );
    return true;
  }
}
