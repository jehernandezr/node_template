import type { AppNotification } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';

/** What notifications delivers over real time, without knowing which transport or which process serves it. */
export abstract class RealtimeFacade {
  /**
   * Sends a new notification to the user's open connections.
   * @param user Recipient.
   * @param notification Notification to send.
   */
  abstract notification(
    user: UserRef,
    notification: AppNotification,
  ): Promise<void>;

  /**
   * Sends the new unread count to the user's open connections.
   * @param user Owner of the inbox.
   * @param count Unread count.
   */
  abstract unreadCount(user: UserRef, count: number): Promise<void>;

  /**
   * Closes the connections of that user session.
   * @param userId Owner of the session.
   * @param sessionId Revoked session.
   */
  abstract closeSession(userId: string, sessionId: string): Promise<void>;

  /**
   * Closes all of the user's connections.
   * @param userId User whose tokens were revoked.
   */
  abstract closeAllSessions(userId: string): Promise<void>;

  /**
   * Tells whether the user has an open connection.
   * @param user User to check.
   * @returns `true` when online.
   */
  abstract isOnline(user: UserRef): Promise<boolean>;
}
