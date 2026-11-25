import { defineEvent } from '@contracts/platform';
import { NotificationsEvent } from '../enums/identifiers.enum.js';
import { NotificationCreatedPayloadSchema } from '../schemas/event.schema.js';

export const NotificationCreatedEvent = defineEvent({
  type: NotificationsEvent.NotificationCreated,
  payload: NotificationCreatedPayloadSchema,
  description:
    'A notification was created: tenant, type and channels used, without text. Reports counts it.',
});
