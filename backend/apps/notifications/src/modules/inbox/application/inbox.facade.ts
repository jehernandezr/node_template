import type { AppNotification } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import type { NotificationState } from '../domain/notification.js';

/** What other modules ask of the inbox. */
export abstract class InboxFacade {
  /**
   * Adds the notification in the open transaction; repeating it does not duplicate it.
   * @param user Owner of the inbox.
   * @param notification Notification to add.
   * @returns The stored notification.
   */
  abstract add(
    user: UserRef,
    notification: NotificationState,
  ): Promise<AppNotification>;

  /**
   * Counts the unread notifications of a user.
   * @param user Owner of the inbox.
   * @returns The unread count.
   */
  abstract unreadCount(user: UserRef): Promise<number>;

  /**
   * Deletes the inbox of a user.
   * @param user User to erase.
   * @returns How many notifications were deleted.
   */
  abstract erase(user: UserRef): Promise<number>;
}
