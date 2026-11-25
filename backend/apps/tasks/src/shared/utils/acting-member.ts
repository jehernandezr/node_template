import type { UserRef } from '@contracts/platform';
import { ActorGuards, AuthenticationError, type Actor } from '@platform/auth';

/** Who acts on the tasks and in which tenant. */
export interface ActingMember {
  readonly tenantId: string;
  readonly ref: UserRef;
}

/**
 * The active tenant and the reference of who acts. A service account becomes the author with its own id and
 * the key's tenant, which is its only tenant.
 */
export class ActingMembers {
  /** @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` if the actor is neither a user nor a service account. */
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
