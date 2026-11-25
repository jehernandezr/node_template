import { defineTopicReference } from '@contracts/platform';
import { NotificationsReference } from '../enums/identifiers.enum.js';

/**
 * Notifications topic with the messages reports counts. It is referenced by
 * name because notifications already imports reports and a contract cannot
 * import whoever imports it.
 */
export const NotificationsEventsReference = defineTopicReference({
  name: NotificationsReference.Topic,
  events: [NotificationsReference.NotificationCreated],
  description:
    'Notifications event that reports counts for the deliveries report.',
});
