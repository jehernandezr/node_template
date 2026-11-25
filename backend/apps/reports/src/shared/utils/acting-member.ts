import type { UserRef } from '@contracts/platform';
import { ActorGuards, AuthenticationError, type Actor } from '@platform/auth';

/** Who requests a report and in which tenant. */
export interface ActingMember {
  readonly tenantId: string;
  readonly ref: UserRef;
  /** Service accounts have no plan features of their own in their access. */
  readonly person: boolean;
}

/** The active tenant and who acts: a person or a service account with its own id. */
export class ActingMembers {
  /** @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` if the actor is neither a user nor a service account. */
  static of(actor: Actor | undefined): ActingMember {
    if (actor !== undefined && ActorGuards.isUser(actor)) {
      return {
        tenantId: actor.tenantId,
        ref: { userId: actor.userId, homeTenantId: actor.homeTenantId },
        person: true,
      };
    }
    if (actor !== undefined && ActorGuards.isServiceAccount(actor)) {
      return {
        tenantId: actor.tenantId,
        ref: { userId: actor.serviceAccountId, homeTenantId: actor.tenantId },
        person: false,
      };
    }
    throw AuthenticationError.unauthenticated('a tenant member is required');
  }
}
