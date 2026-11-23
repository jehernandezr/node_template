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
 * Cola `notifications-realtime-control`: cierra las conexiones de tiempo real de lo que identity revoca. La
 * revocación de una sesión llega con su usuario en `session.revoked`; la de todos los tokens de un usuario
 * cierra todas sus conexiones. La de un tenant no nombra usuarios: cada conexión abierta la encuentra en el
 * estado de autenticación compartido en su siguiente latido.
 */
@Injectable()
export class RealtimeControlConsumer {
  constructor(private readonly realtime: RealtimeFacade) {}

  @Subscribe(SessionRevokedEvent)
  onSessionRevoked(data: SessionRevokedPayload): Promise<void> {
    return this.realtime.closeSession(data.userId, data.sessionId);
  }

  @Subscribe(TokensRevokedEvent)
  onTokensRevoked(data: TokensRevokedPayload): Promise<void> {
    return data.scope === RevocationScope.User
      ? this.realtime.closeAllSessions(data.subjectId)
      : Promise.resolve();
  }
}
