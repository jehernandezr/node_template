import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import { UserErasedPayloadSchema } from '../schemas/orchestration.schema.js';
import {
  UserEmailChangedPayloadSchema,
  UserReactivatedPayloadSchema,
  UserRegisteredPayloadSchema,
  UserSuspendedPayloadSchema,
} from '../schemas/event.schema.js';

export const UserRegisteredEvent = defineEvent({
  type: IdentityEvent.UserRegistered,
  payload: UserRegisteredPayloadSchema,
  description: 'A new user was registered.',
});

export const UserSuspendedEvent = defineEvent({
  type: IdentityEvent.UserSuspended,
  payload: UserSuspendedPayloadSchema,
  description: 'A user was suspended and their sessions were revoked.',
});

export const UserReactivatedEvent = defineEvent({
  type: IdentityEvent.UserReactivated,
  payload: UserReactivatedPayloadSchema,
  description: 'A suspended user was reactivated.',
});

export const UserEmailChangedEvent = defineEvent({
  type: IdentityEvent.UserEmailChanged,
  payload: UserEmailChangedPayloadSchema,
  description: 'The email of a user changed. It does not include addresses.',
});

export const UserErasedEvent = defineEvent({
  type: IdentityEvent.UserErased,
  payload: UserErasedPayloadSchema,
  description:
    'The personal data of a user was erased. Services that keep a trace of the user delete or anonymize it.',
});
