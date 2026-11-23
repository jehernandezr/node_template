import type { UserRef } from '@contracts/platform';
import { ActorGuards, AuthenticationError, type Actor } from '@platform/auth';

/** Quién actúa sobre las tareas y en qué tenant. */
export interface ActingMember {
  readonly tenantId: string;
  readonly ref: UserRef;
}

/**
 * El tenant activo y la referencia de quien actúa. Una service account queda como autora con su propio id y
 * el tenant de la key, que es su único tenant.
 */
export class ActingMembers {
  /** @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` si el actor no es un usuario ni una service account. */
  static of(actor: Actor | undefined): ActingMember {
    if (actor !== undefined && ActorGuards.isUser(actor)) {
      return {
        tenantId: actor.tenantId,
        ref: { userId: actor.userId, homeTenantId: actor.homeTenantId },
      };
    }
    if (actor !== undefined && ActorGuards.isServiceAccount(actor)) {
      return {
        tenantId: actor.tenantId,
        ref: { userId: actor.serviceAccountId, homeTenantId: actor.tenantId },
      };
    }
    throw AuthenticationError.unauthenticated('a tenant member is required');
  }
}
