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
 * Revoca una sesión dentro de la transacción abierta: marca la fila, publica `SessionRevoked` y
 * `TokensRevoked` por el outbox y, después del commit, escribe `auth:revoked:{sid}` para que los demás
 * servicios rechacen su access token.
 */
@Injectable()
export class SessionRevoker {
  /** La marca dura lo que le queda al access token más la tolerancia de relojes del verificador. */
  private static readonly CLOCK_SKEW_MS = 30_000;

  constructor(
    private readonly sessions: SessionRepository,
    private readonly state: AuthStateWriter,
    private readonly bus: MessageBus,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  /** Devuelve `false` si ya estaba revocada. */
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
