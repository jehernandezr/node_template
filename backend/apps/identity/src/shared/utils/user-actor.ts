import {
  ActorGuards,
  AuthenticationError,
  type Actor,
  type UserActor,
} from '@platform/auth';
import type { UserRef } from '../types/user-ref.type.js';

/**
 * The user of an authenticated route. The `/v1/me` routes only make sense with a user: an
 * API key or the system has no session.
 * @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` if the actor is not a user.
 */
export function requireUserActor(actor: Actor | undefined): UserActor {
  if (actor === undefined || !ActorGuards.isUser(actor)) {
    throw AuthenticationError.unauthenticated('a user session is required');
  }
  return actor;
}

/** The actor's user and their home tenant, through which their shard is reached. */
export function userRefOf(actor: UserActor): UserRef {
  return { userId: actor.userId, homeTenantId: actor.homeTenantId };
}

/**
 * The active tenant of a user or a service account: the `/v1/tenant/*` routes work on it.
 * @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` if the actor has no tenant.
 */
export function tenantOfActor(actor: Actor | undefined): string {
  if (
    actor === undefined ||
    (!ActorGuards.isUser(actor) && !ActorGuards.isServiceAccount(actor))
  ) {
    throw AuthenticationError.unauthenticated('a tenant actor is required');
  }
  return actor.tenantId;
}
