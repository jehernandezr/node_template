import { ActorGuards, AuthenticationError, type Actor } from '@platform/auth';

/** El tenant sobre el que actúa quien llama: el activo de la sesión o el de la API key. */
export class ActingTenant {
  /** @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` si el actor no es un usuario ni una service account. */
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
