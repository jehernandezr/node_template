import { defineEvent } from '@contracts/platform';
import { IdentityEvent } from '../enums/identifiers.enum.js';
import {
  MembershipChangedPayloadSchema,
  PermissionsChangedPayloadSchema,
} from '../schemas/event.schema.js';

/**
 * Cambio de membresía. Lo consume la proyección de acceso, que mantiene la
 * vista de permisos por usuario y tenant.
 */
export const MembershipChangedEvent = defineEvent({
  type: IdentityEvent.MembershipChanged,
  payload: MembershipChangedPayloadSchema,
  description: 'Cambió la membresía de un usuario en un tenant.',
});

export const PermissionsChangedEvent = defineEvent({
  type: IdentityEvent.PermissionsChanged,
  payload: PermissionsChangedPayloadSchema,
  description:
    'Cambiaron los permisos de un usuario o de un tenant. Sin userId afecta a todo el tenant.',
});
