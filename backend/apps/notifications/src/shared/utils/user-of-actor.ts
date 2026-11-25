import type { UserRef } from '@contracts/platform';
import { ActorGuards, AuthenticationError, type Actor } from '@platform/auth';

/** The inbox and preferences belong to a user: an API key has none. */
export class UserOfActor {
  /** @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` if the actor is not a user. */
  static of(actor: Actor | undefined): UserRef {
    if (actor === undefined || !ActorGuards.isUser(actor)) {
      throw AuthenticationError.unauthenticated('a user session is required');
    }
    return { userId: actor.userId, homeTenantId: actor.homeTenantId };
  }
}
