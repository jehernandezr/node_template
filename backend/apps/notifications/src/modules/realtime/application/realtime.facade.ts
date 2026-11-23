import type { AppNotification } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';

/** Lo que notifications entrega por tiempo real, sin saber qué transporte ni qué proceso atiende. */
export abstract class RealtimeFacade {
  abstract notification(
    user: UserRef,
    notification: AppNotification,
  ): Promise<void>;

  abstract unreadCount(user: UserRef, count: number): Promise<void>;

  /** Cierra las conexiones de esa sesión del usuario. */
  abstract closeSession(userId: string, sessionId: string): Promise<void>;

  /** Cierra todas las conexiones del usuario. */
  abstract closeAllSessions(userId: string): Promise<void>;

  abstract isOnline(user: UserRef): Promise<boolean>;
}
