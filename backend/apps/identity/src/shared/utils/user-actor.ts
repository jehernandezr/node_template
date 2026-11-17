import {
  ActorGuards,
  AuthenticationError,
  type Actor,
  type UserActor,
} from '@platform/auth';
import type { UserRef } from '../types/user-ref.type.js';

/**
 * El usuario de una ruta autenticada. Las rutas de `/v1/me` solo tienen sentido con un usuario: una
 * API key o el sistema no tienen sesión.
 * @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` si el actor no es un usuario.
 */
export function requireUserActor(actor: Actor | undefined): UserActor {
  if (actor === undefined || !ActorGuards.isUser(actor)) {
    throw AuthenticationError.unauthenticated('a user session is required');
  }
  return actor;
}

/** El usuario del actor y su tenant de origen, con los que se llega a su shard. */
export function userRefOf(actor: UserActor): UserRef {
  return { userId: actor.userId, homeTenantId: actor.homeTenantId };
}

/**
 * El tenant activo de un usuario o de una service account: las rutas `/v1/tenant/*` trabajan sobre él.
 * @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` si el actor no tiene tenant.
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
