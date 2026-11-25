import type { AppNotification } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';

/** What notifications delivers over real time, without knowing which transport or which process serves it. */
export abstract class RealtimeFacade {
  abstract notification(
    user: UserRef,
    notification: AppNotification,
  ): Promise<void>;

  abstract unreadCount(user: UserRef, count: number): Promise<void>;

  /** Closes the connections of that user session. */
  abstract closeSession(userId: string, sessionId: string): Promise<void>;

  /** Closes all of the user's connections. */
  abstract closeAllSessions(userId: string): Promise<void>;

  abstract isOnline(user: UserRef): Promise<boolean>;
}
