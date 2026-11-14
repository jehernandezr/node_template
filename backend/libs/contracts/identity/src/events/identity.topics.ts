import { defineTopic } from '@contracts/platform';
import { IdentityTopic } from '../enums/identifiers.enum.js';
import { SessionRevokedEvent, TokensRevokedEvent } from './identity.events.js';

/** Tópico de los eventos de identity. Lo consumen el gateway de tiempo real y los servicios con caché de tokens. */
export const IdentityEventsTopic = defineTopic({
  name: IdentityTopic.Events,
  events: [SessionRevokedEvent, TokensRevokedEvent],
  description:
    'Eventos de identity: sesiones y tokens revocados. Cada servicio suscribe su propia cola.',
});
