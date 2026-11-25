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

/** Topic of the identity events. Consumed by the real-time gateway and the services with a token cache. */
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
    'Identity events: users, devices, tenants, memberships, API keys, sessions and alerts. Each service subscribes its own queue.',
});
