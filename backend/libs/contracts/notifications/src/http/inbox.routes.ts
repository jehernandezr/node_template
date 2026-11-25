import {
  Access,
  defineRoute,
  HttpMethod,
  PageQuerySchema,
} from '@contracts/platform';
import { SessionGuardErrors } from '@contracts/identity';
import {
  NotificationsErrorCode,
  NotificationsRoute,
} from '../enums/identifiers.enum.js';
import {
  MarkNotificationReadRequestSchema,
  NotificationPageSchema,
  UnreadCountSchema,
} from '../schemas/notification.schema.js';

const guard = SessionGuardErrors;

/** `GET /v1/notifications`: the user's inbox, from newest to oldest. */
export const ListInboxRoute = defineRoute({
  id: NotificationsRoute.ListInbox,
  method: HttpMethod.Get,
  path: '/v1/notifications',
  request: PageQuerySchema,
  response: NotificationPageSchema,
  errors: guard,
  access: Access.authenticated(),
  description: 'Lists the notifications in the user inbox.',
});

/** `GET /v1/notifications/unread-count`: unread notifications. */
export const GetUnreadCountRoute = defineRoute({
  id: NotificationsRoute.GetUnreadCount,
  method: HttpMethod.Get,
  path: '/v1/notifications/unread-count',
  response: UnreadCountSchema,
  errors: guard,
  access: Access.authenticated(),
  description: 'Counts the unread notifications in the user inbox.',
});

/** `POST /v1/notifications/{notificationId}/read`: marks a notification as read. */
export const MarkReadRoute = defineRoute({
  id: NotificationsRoute.MarkRead,
  method: HttpMethod.Post,
  path: '/v1/notifications/{notificationId}/read',
  request: MarkNotificationReadRequestSchema,
  errors: [...guard, NotificationsErrorCode.InboxNotFound],
  access: Access.authenticated(),
  description: 'Marks a notification as read; repeating it does not fail.',
});

/** `POST /v1/notifications/read-all`: marks the whole inbox as read. */
export const MarkAllReadRoute = defineRoute({
  id: NotificationsRoute.MarkAllRead,
  method: HttpMethod.Post,
  path: '/v1/notifications/read-all',
  errors: guard,
  access: Access.authenticated(),
  description: 'Marks all notifications of the user as read.',
});
