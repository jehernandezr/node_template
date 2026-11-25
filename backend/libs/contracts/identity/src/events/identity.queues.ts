import { defineQueue } from '@contracts/platform';
import { IdentityQueue } from '../enums/identifiers.enum.js';
import {
  MembershipChangedEvent,
  PermissionsChangedEvent,
} from './access.events.js';
import { BillingEventsReference } from './billing.references.js';
import { SendPasswordResetCommand } from './identity.commands.js';
import { IdentityEventsTopic } from './identity.topics.js';
import { SessionRevokedEvent, TokensRevokedEvent } from './identity.events.js';

/**
 * Access projection: keeps the permissions per user and tenant that the other
 * services read. It only cares about membership changes.
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
    'Access projection per user and tenant, fed by the membership changes.',
});

/**
 * Shared authentication state: identity writes revocations and permission
 * versions to `auth:*` right after the commit and replays them from its own
 * events, so a Valkey outage or a crash after the commit never leaves a revoked
 * token alive or a stale version current.
 */
export const AuthStateQueue = defineQueue({
  name: IdentityQueue.AuthState,
  subscriptions: [
    {
      topic: IdentityEventsTopic,
      events: [
        SessionRevokedEvent,
        TokensRevokedEvent,
        PermissionsChangedEvent,
      ],
    },
  ],
  description:
    'Replays the session revocations, user revocations and permission versions of identity into the shared auth state.',
});

/**
 * Billing changes that affect access: suspension, reactivation and current
 * features of a tenant.
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
    'Billing events that identity applies: it suspends or reactivates the tenant and refreshes its features.',
});

/**
 * Password reset requests identity sends to itself, so the request answers before anyone looks up the email.
 */
export const PasswordResetsQueue = defineQueue({
  name: IdentityQueue.PasswordResets,
  commands: [SendPasswordResetCommand],
  description:
    'Password reset requests that identity sends to itself and answers by email from the worker.',
});
