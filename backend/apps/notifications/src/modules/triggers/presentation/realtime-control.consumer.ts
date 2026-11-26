import { Injectable } from '@nestjs/common';
import {
  RevocationScope,
  SessionRevokedEvent,
  TokensRevokedEvent,
  type SessionRevokedPayload,
  type TokensRevokedPayload,
} from '@contracts/identity';
import { Subscribe } from '@platform/messaging/nest';
import { RealtimeFacade } from '../../realtime/index.js';

/**
 * `notifications-realtime-control` queue: closes the real-time connections of what identity revokes. The
 * revocation of a session arrives with its user in `session.revoked`; the revocation of all of a user's tokens
 * closes all their connections. A tenant revocation names no users: each open connection finds it in the
 * shared authentication state on its next heartbeat.
 */
@Injectable()
export class RealtimeControlConsumer {
  constructor(private readonly realtime: RealtimeFacade) {}

  /**
   * Closes the connections of a revoked session.
   * @param data Revoked session.
   */
  @Subscribe(SessionRevokedEvent)
  onSessionRevoked(data: SessionRevokedPayload): Promise<void> {
    return this.realtime.closeSession(data.userId, data.sessionId);
  }

  /**
   * Closes every connection of a user whose tokens were revoked.
   * @param data Revocation scope.
   */
  @Subscribe(TokensRevokedEvent)
  onTokensRevoked(data: TokensRevokedPayload): Promise<void> {
    return data.scope === RevocationScope.User
      ? this.realtime.closeAllSessions(data.subjectId)
      : Promise.resolve();
  }
}
