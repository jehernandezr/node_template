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

/** `GET /v1/notifications`: bandeja del usuario, de la más nueva a la más antigua. */
export const ListInboxRoute = defineRoute({
  id: NotificationsRoute.ListInbox,
  method: HttpMethod.Get,
  path: '/v1/notifications',
  request: PageQuerySchema,
  response: NotificationPageSchema,
  errors: guard,
  access: Access.authenticated(),
  description: 'Lista las notificaciones de la bandeja del usuario.',
});

/** `GET /v1/notifications/unread-count`: notificaciones sin leer. */
export const GetUnreadCountRoute = defineRoute({
  id: NotificationsRoute.GetUnreadCount,
  method: HttpMethod.Get,
  path: '/v1/notifications/unread-count',
  response: UnreadCountSchema,
  errors: guard,
  access: Access.authenticated(),
  description: 'Cuenta las notificaciones sin leer de la bandeja del usuario.',
});

/** `POST /v1/notifications/{notificationId}/read`: marca una notificación como leída. */
export const MarkReadRoute = defineRoute({
  id: NotificationsRoute.MarkRead,
  method: HttpMethod.Post,
  path: '/v1/notifications/{notificationId}/read',
  request: MarkNotificationReadRequestSchema,
  errors: [...guard, NotificationsErrorCode.InboxNotFound],
  access: Access.authenticated(),
  description: 'Marca como leída una notificación; repetirlo no falla.',
});

/** `POST /v1/notifications/read-all`: marca toda la bandeja como leída. */
export const MarkAllReadRoute = defineRoute({
  id: NotificationsRoute.MarkAllRead,
  method: HttpMethod.Post,
  path: '/v1/notifications/read-all',
  errors: guard,
  access: Access.authenticated(),
  description: 'Marca como leídas todas las notificaciones del usuario.',
});
