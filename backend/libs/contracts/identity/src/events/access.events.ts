import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import {
  MembershipChangedPayloadSchema,
  PermissionsChangedPayloadSchema,
} from '../schemas/event.schema.js';

/**
 * Membership change. Consumed by the access projection, which maintains the
 * permission view per user and tenant.
 */
export const MembershipChangedEvent = defineEvent({
  type: IdentityEvent.MembershipChanged,
  payload: MembershipChangedPayloadSchema,
  description: 'The membership of a user in a tenant changed.',
});

export const PermissionsChangedEvent = defineEvent({
  type: IdentityEvent.PermissionsChanged,
  payload: PermissionsChangedPayloadSchema,
  description:
    'The permissions of a user or a tenant changed. Without userId it affects the whole tenant.',
});
