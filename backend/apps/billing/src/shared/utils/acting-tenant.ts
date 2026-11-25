import { ActorGuards, AuthenticationError, type Actor } from '@platform/auth';

/** The tenant the caller acts on: the session's active one or the API key's. */
export class ActingTenant {
  /** @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` if the actor is neither a user nor a service account. */
  static of(actor: Actor | undefined): string {
    if (
      actor !== undefined &&
      (ActorGuards.isUser(actor) || ActorGuards.isServiceAccount(actor))
    ) {
      return actor.tenantId;
    }
    throw AuthenticationError.unauthenticated('a tenant member is required');
  }
}
