import { defineTopic } from '@contracts/platform';
import { IdentityTopic } from '../enums/identifiers.enum.js';
import { ApiKeyCreatedEvent, ApiKeyRevokedEvent } from './api-key.events.js';
import { DeviceRegisteredEvent, DeviceRemovedEvent } from './device.events.js';
import {
  MembershipChangedEvent,
  PermissionsChangedEvent,
} from './access.events.js';
import { SecurityAlertRaisedEvent } from './security.events.js';
import { SessionRevokedEvent, TokensRevokedEvent } from './identity.events.js';
import {
  TenantCreatedEvent,
  TenantReactivatedEvent,
  TenantSuspendedEvent,
} from './tenant.events.js';
import {
  UserEmailChangedEvent,
  UserErasedEvent,
  UserReactivatedEvent,
  UserRegisteredEvent,
  UserSuspendedEvent,
} from './user.events.js';

/** Tópico de los eventos de identity. Lo consumen el gateway de tiempo real y los servicios con caché de tokens. */
export const IdentityEventsTopic = defineTopic({
  name: IdentityTopic.Events,
  events: [
    SessionRevokedEvent,
    TokensRevokedEvent,
    UserRegisteredEvent,
    UserSuspendedEvent,
    UserReactivatedEvent,
    UserEmailChangedEvent,
    DeviceRegisteredEvent,
    DeviceRemovedEvent,
    TenantCreatedEvent,
    TenantSuspendedEvent,
    TenantReactivatedEvent,
    MembershipChangedEvent,
    PermissionsChangedEvent,
    ApiKeyCreatedEvent,
    ApiKeyRevokedEvent,
    SecurityAlertRaisedEvent,
    UserErasedEvent,
  ],
  description:
    'Eventos de identity: usuarios, dispositivos, tenants, membresías, API keys, sesiones y alertas. Cada servicio suscribe su propia cola.',
});
