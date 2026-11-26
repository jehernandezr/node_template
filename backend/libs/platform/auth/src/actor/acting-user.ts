import type { UserRef } from '@contracts/platform';
import { AuthenticationError } from '../errors/authentication.error.js';
import type { Actor, UserActor } from './actor.js';
import { ActorGuards } from './actor-guards.js';

/** The person behind a route that only makes sense with a user session: an API key or the system has none. */
export class ActingUser {
  /**
   * The user actor of the route.
   * @param actor Actor of the request.
   * @returns The user actor.
   * @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` if the actor is not a user.
   */
  static of(actor: Actor | undefined): UserActor {
    if (actor === undefined || !ActorGuards.isUser(actor)) {
      throw AuthenticationError.unauthenticated('a user session is required');
    }
    return actor;
  }

  /**
   * The user and their home tenant, through which their shard is reached.
   * @param actor Actor of the request.
   * @returns The user reference.
   * @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` if the actor is not a user.
   */
  static refOf(actor: Actor | undefined): UserRef {
    const user = ActingUser.of(actor);
    return { userId: user.userId, homeTenantId: user.homeTenantId };
  }
}
