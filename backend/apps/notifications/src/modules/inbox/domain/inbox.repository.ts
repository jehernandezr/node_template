import type { UserRef } from '@contracts/platform';
import type { NotificationState } from './notification.js';

/** Inbox of the user of the open `ShardScope`. */
export abstract class InboxRepository {
  /**
   * Adds the notification if its id was not present; returns the one stored with that id. The row stores the home
   * tenant of `owner` so it moves with it.
   */
  abstract add(
    owner: UserRef,
    notification: NotificationState,
  ): Promise<NotificationState>;

  /** From newest to oldest, after `beforeId`. */
  abstract page(
    userId: string,
    beforeId: string | undefined,
    limit: number,
  ): Promise<readonly NotificationState[]>;

  abstract unreadCount(userId: string): Promise<number>;

  /** `false` if the notification does not exist or belongs to another user; marking it again does not change the date. */
  abstract markRead(
    userId: string,
    notificationId: string,
    at: Date,
  ): Promise<boolean>;

  abstract markAllRead(userId: string, at: Date): Promise<void>;

  abstract erase(userId: string): Promise<number>;
}
