import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import {
  DeviceRegisteredPayloadSchema,
  DeviceRemovedPayloadSchema,
} from '../schemas/event.schema.js';

export const DeviceRegisteredEvent = defineEvent({
  type: IdentityEvent.DeviceRegistered,
  payload: DeviceRegisteredPayloadSchema,
  description:
    'Se registró un dispositivo que puede aprobar acciones sensibles.',
});

export const DeviceRemovedEvent = defineEvent({
  type: IdentityEvent.DeviceRemoved,
  payload: DeviceRemovedPayloadSchema,
  description: 'Se quitó un dispositivo de la cuenta.',
});
