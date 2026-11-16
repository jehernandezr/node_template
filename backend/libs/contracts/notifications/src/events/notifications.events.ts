import { defineEvent } from '@contracts/platform';
import { NotificationsEvent } from '../enums/identifiers.enum.js';
import { NotificationCreatedPayloadSchema } from '../schemas/event.schema.js';

export const NotificationCreatedEvent = defineEvent({
  type: NotificationsEvent.NotificationCreated,
  payload: NotificationCreatedPayloadSchema,
  description:
    'Se creó una notificación: tenant, tipo y canales usados, sin texto. Reports lo cuenta.',
});
