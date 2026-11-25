import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import {
  DeviceRegisteredPayloadSchema,
  DeviceRemovedPayloadSchema,
} from '../schemas/event.schema.js';

export const DeviceRegisteredEvent = defineEvent({
  type: IdentityEvent.DeviceRegistered,
  payload: DeviceRegisteredPayloadSchema,
  description: 'A device that can approve sensitive actions was registered.',
});

export const DeviceRemovedEvent = defineEvent({
  type: IdentityEvent.DeviceRemoved,
  payload: DeviceRemovedPayloadSchema,
  description: 'A device was removed from the account.',
});
