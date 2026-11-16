import { defineTopic } from '@contracts/platform';
import { NotificationsTopic } from '../enums/identifiers.enum.js';
import { NotificationCreatedEvent } from './notifications.events.js';

/** Tópico de los eventos de notifications. Lo consume reports. */
export const NotificationsEventsTopic = defineTopic({
  name: NotificationsTopic.Events,
  events: [NotificationCreatedEvent],
  description:
    'Eventos de notifications: se creó una notificación. Cada servicio suscribe su propia cola.',
});
