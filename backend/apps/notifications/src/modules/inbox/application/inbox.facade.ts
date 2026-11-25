import type { AppNotification } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import type { NotificationState } from '../domain/notification.js';

/** What other modules ask of the inbox. */
export abstract class InboxFacade {
  /** Adds the notification in the open transaction; repeating it does not duplicate it. */
  abstract add(
    user: UserRef,
    notification: NotificationState,
  ): Promise<AppNotification>;

  abstract unreadCount(user: UserRef): Promise<number>;

  abstract erase(user: UserRef): Promise<number>;
}
