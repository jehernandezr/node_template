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
import { UserOfActor } from '../../../shared/utils/user-of-actor.js';
import { ManageInbox } from '../application/manage-inbox.use-case.js';

@Resource(NotificationsResource.Inbox)
export class InboxController {
  constructor(private readonly inbox: ManageInbox) {}

  @Endpoint(ListInboxRoute)
  list(
    @Input() input: PageQuery,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<NotificationPage> {
    return this.inbox.list(UserOfActor.of(actor), input);
  }

  @Endpoint(GetUnreadCountRoute)
  async unreadCount(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<UnreadCount> {
    return { count: await this.inbox.unreadCount(UserOfActor.of(actor)) };
  }

  @Endpoint(MarkReadRoute)
  markRead(
    @Input() input: MarkNotificationReadRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    return this.inbox.markRead(UserOfActor.of(actor), input.notificationId);
  }

  @Endpoint(MarkAllReadRoute)
  markAllRead(@CurrentActor() actor: Actor | undefined): Promise<void> {
    return this.inbox.markAllRead(UserOfActor.of(actor));
  }
}
