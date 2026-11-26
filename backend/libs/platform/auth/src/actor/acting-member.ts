import type { UserRef } from '@contracts/platform';
import { AuthenticationError } from '../errors/authentication.error.js';
import type { Actor } from './actor.js';
import { ActorGuards } from './actor-guards.js';

/**
 * Who acts on a tenant's data and in which tenant: a person with their session's active tenant, or a service account
 * with its key's tenant, which is its only one. A service account authors its writes with its own id and that tenant
 * as home.
 */
export class ActingMember {
  private constructor(
    readonly tenantId: string,
    readonly ref: UserRef,
    readonly person: boolean,
  ) {}

  /**
   * The member behind an authenticated route that works on a tenant.
   * @param actor Actor of the request.
   * @returns The acting member.
   * @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` if the actor is neither a user nor a service account.
   */
  static of(actor: Actor | undefined): ActingMember {
    if (actor !== undefined && ActorGuards.isUser(actor)) {
      return new ActingMember(
        actor.tenantId,
        { userId: actor.userId, homeTenantId: actor.homeTenantId },
        true,
      );
    }
    if (actor !== undefined && ActorGuards.isServiceAccount(actor)) {
      return new ActingMember(
        actor.tenantId,
        { userId: actor.serviceAccountId, homeTenantId: actor.tenantId },
        false,
      );
    }
    throw AuthenticationError.unauthenticated('a tenant member is required');
  }
}
