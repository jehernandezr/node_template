import type { UserRef } from '@contracts/platform';
import { ActorGuards, AuthenticationError, type Actor } from '@platform/auth';

/** La bandeja y las preferencias son de un usuario: una API key no tiene. */
export class UserOfActor {
  /** @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` si el actor no es un usuario. */
  static of(actor: Actor | undefined): UserRef {
    if (actor === undefined || !ActorGuards.isUser(actor)) {
      throw AuthenticationError.unauthenticated('a user session is required');
    }
    return { userId: actor.userId, homeTenantId: actor.homeTenantId };
  }
}
