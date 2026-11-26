import { ActingUser } from '@platform/auth';
import {
  GetUnreadCountRoute,
  ListInboxRoute,
  MarkAllReadRoute,
  MarkReadRoute,
  type MarkNotificationReadRequest,
  type NotificationPage,
  type UnreadCount,
} from '@contracts/notifications';
import type { PageQuery } from '@contracts/platform';
import type { Actor } from '@platform/auth';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import { NotificationsResource } from '../../../shared/enums/notifications-resource.enum.js';
import { ManageInbox } from '../application/manage-inbox.use-case.js';

/** HTTP routes of the inbox of the signed-in user. */
@Resource(NotificationsResource.Inbox)
export class InboxController {
  constructor(private readonly inbox: ManageInbox) {}

  /**
   * Lists the user's notifications.
   * @param input Cursor and page size.
   * @param actor Signed-in user.
   * @returns One page of notifications.
   */
  @Endpoint(ListInboxRoute)
  list(
    @Input() input: PageQuery,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<NotificationPage> {
    return this.inbox.list(ActingUser.refOf(actor), input);
  }

  /**
   * Counts the user's unread notifications.
   * @param actor Signed-in user.
   * @returns The unread count.
   */
  @Endpoint(GetUnreadCountRoute)
  async unreadCount(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<UnreadCount> {
    return { count: await this.inbox.unreadCount(ActingUser.refOf(actor)) };
  }

  /**
   * Marks one notification read.
   * @param input Notification id.
   * @param actor Signed-in user.
   */
  @Endpoint(MarkReadRoute)
  markRead(
    @Input() input: MarkNotificationReadRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    return this.inbox.markRead(ActingUser.refOf(actor), input.notificationId);
  }

  /**
   * Marks every notification read.
   * @param actor Signed-in user.
   */
  @Endpoint(MarkAllReadRoute)
  markAllRead(@CurrentActor() actor: Actor | undefined): Promise<void> {
    return this.inbox.markAllRead(ActingUser.refOf(actor));
  }
}
