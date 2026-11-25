import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import { SecurityAlertRaisedPayloadSchema } from '../schemas/event.schema.js';

export const SecurityAlertRaisedEvent = defineEvent({
  type: IdentityEvent.SecurityAlertRaised,
  payload: SecurityAlertRaisedPayloadSchema,
  description:
    'A security alert was raised on an account. Notifies the user through their channel.',
});
