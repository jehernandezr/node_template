import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import {
  TenantCreatedPayloadSchema,
  TenantReactivatedPayloadSchema,
  TenantSuspendedPayloadSchema,
} from '../schemas/event.schema.js';

export const TenantCreatedEvent = defineEvent({
  type: IdentityEvent.TenantCreated,
  payload: TenantCreatedPayloadSchema,
  description: 'Se creó un tenant.',
});

export const TenantSuspendedEvent = defineEvent({
  type: IdentityEvent.TenantSuspended,
  payload: TenantSuspendedPayloadSchema,
  description: 'Se suspendió un tenant y se revocaron sus tokens.',
});

export const TenantReactivatedEvent = defineEvent({
  type: IdentityEvent.TenantReactivated,
  payload: TenantReactivatedPayloadSchema,
  description: 'Se reactivó un tenant suspendido.',
});
