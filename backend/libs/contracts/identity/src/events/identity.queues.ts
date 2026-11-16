import { defineQueue } from '@contracts/platform';
import { IdentityQueue } from '../enums/identifiers.enum.js';
import { MembershipChangedEvent } from './access.events.js';
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
