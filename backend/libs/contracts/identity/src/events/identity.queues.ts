import { defineQueue } from '@contracts/platform';
import { IdentityQueue } from '../enums/identifiers.enum.js';
import { MembershipChangedEvent } from './access.events.js';
import { BillingEventsReference } from './billing.references.js';
import { IdentityEventsTopic } from './identity.topics.js';

/**
 * Proyección de acceso: mantiene los permisos por usuario y tenant que leen
 * los demás servicios. Solo le interesan los cambios de membresía.
 */
export const AccessProjectionQueue = defineQueue({
  name: IdentityQueue.AccessProjection,
  subscriptions: [
    {
      topic: IdentityEventsTopic,
      events: [MembershipChangedEvent],
    },
  ],
  description:
    'Proyección de acceso por usuario y tenant, alimentada por los cambios de membresía.',
});

/**
 * Cambios de billing que afectan al acceso: suspensión, reactivación y
 * funcionalidades vigentes de un tenant.
 */
export const BillingEventsQueue = defineQueue({
  name: IdentityQueue.Billing,
  subscriptions: [
    {
      topic: BillingEventsReference,
      events: BillingEventsReference.events,
    },
  ],
  description:
    'Eventos de billing que identity aplica: suspende o reactiva el tenant y refresca sus funcionalidades.',
});
