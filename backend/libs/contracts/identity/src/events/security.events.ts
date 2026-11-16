import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import { SecurityAlertRaisedPayloadSchema } from '../schemas/event.schema.js';

export const SecurityAlertRaisedEvent = defineEvent({
  type: IdentityEvent.SecurityAlertRaised,
  payload: SecurityAlertRaisedPayloadSchema,
  description:
    'Se levantó una alerta de seguridad sobre una cuenta. Notifica al usuario por su canal.',
});
