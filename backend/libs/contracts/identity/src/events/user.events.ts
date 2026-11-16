import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import {
  UserEmailChangedPayloadSchema,
  UserReactivatedPayloadSchema,
  UserRegisteredPayloadSchema,
  UserSuspendedPayloadSchema,
} from '../schemas/event.schema.js';

export const UserRegisteredEvent = defineEvent({
  type: IdentityEvent.UserRegistered,
  payload: UserRegisteredPayloadSchema,
  description: 'Se registró un usuario nuevo.',
});

export const UserSuspendedEvent = defineEvent({
  type: IdentityEvent.UserSuspended,
  payload: UserSuspendedPayloadSchema,
  description: 'Se suspendió un usuario y se revocaron sus sesiones.',
});

export const UserReactivatedEvent = defineEvent({
  type: IdentityEvent.UserReactivated,
  payload: UserReactivatedPayloadSchema,
  description: 'Se reactivó un usuario suspendido.',
});

export const UserEmailChangedEvent = defineEvent({
  type: IdentityEvent.UserEmailChanged,
  payload: UserEmailChangedPayloadSchema,
  description: 'Cambió el email de un usuario. No incluye direcciones.',
});
