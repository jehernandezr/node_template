import type { UserRef } from '@contracts/platform';
import type { NotificationState } from './notification.js';

/** Inbox of the user of the open `ShardScope`. */
export abstract class InboxRepository {
  /**
   * Adds the notification if its id was not present; returns the one stored with that id. The row stores the home
   * tenant of `owner` so it moves with it.
   * @param owner Owner of the inbox.
   * @param notification Notification to add.
   * @returns The stored notification.
   */
  abstract add(
    owner: UserRef,
    notification: NotificationState,
  ): Promise<NotificationState>;

  /**
   * From newest to oldest, after `beforeId`.
   * @param userId Owner of the inbox.
   * @param beforeId Cursor; the first page when omitted.
   * @param limit Page size.
   * @returns The notifications of the page.
   */
  abstract page(
    userId: string,
    beforeId: string | undefined,
    limit: number,
  ): Promise<readonly NotificationState[]>;

  /**
   * Counts the unread notifications of a user.
   * @param userId Owner of the inbox.
   * @returns The unread count.
   */
  abstract unreadCount(userId: string): Promise<number>;

  /**
   * `false` if the notification does not exist or belongs to another user; marking it again does not change the date.
   * @param userId Owner of the inbox.
   * @param notificationId Notification to mark.
   * @param at Instant it was read.
   * @returns `true` when the notification is the user's.
   */
  abstract markRead(
    userId: string,
    notificationId: string,
    at: Date,
  ): Promise<boolean>;

  /**
   * Marks every notification of the user read.
   * @param userId Owner of the inbox.
   * @param at Instant they were read.
   */
  abstract markAllRead(userId: string, at: Date): Promise<void>;

  /**
   * Deletes the inbox of a user.
   * @param userId User to erase.
   * @returns How many notifications were deleted.
   */
  abstract erase(userId: string): Promise<number>;
}
