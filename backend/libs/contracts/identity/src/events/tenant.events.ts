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
  description: 'A tenant was created.',
});

export const TenantSuspendedEvent = defineEvent({
  type: IdentityEvent.TenantSuspended,
  payload: TenantSuspendedPayloadSchema,
  description: 'A tenant was suspended and its tokens were revoked.',
});

export const TenantReactivatedEvent = defineEvent({
  type: IdentityEvent.TenantReactivated,
  payload: TenantReactivatedPayloadSchema,
  description: 'A suspended tenant was reactivated.',
});
