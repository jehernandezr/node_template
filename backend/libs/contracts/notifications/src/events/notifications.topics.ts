import { defineTopic } from '@contracts/platform';
import { NotificationsTopic } from '../enums/identifiers.enum.js';
import { NotificationCreatedEvent } from './notifications.events.js';

/** Topic of the notifications events. Consumed by reports. */
export const NotificationsEventsTopic = defineTopic({
  name: NotificationsTopic.Events,
  events: [NotificationCreatedEvent],
  description:
    'Notifications events: a notification was created. Each service subscribes its own queue.',
});
