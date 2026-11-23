import type { UserRef } from '@contracts/platform';
import { ActorGuards, AuthenticationError, type Actor } from '@platform/auth';

/** Quién pide un reporte y en qué tenant. */
export interface ActingMember {
  readonly tenantId: string;
  readonly ref: UserRef;
  /** Las service accounts no tienen funcionalidades de plan propias en su acceso. */
  readonly person: boolean;
}

/** El tenant activo y quien actúa: una persona o una service account con su propio id. */
export class ActingMembers {
  /** @throws AuthenticationError `PLATFORM.AUTH.UNAUTHENTICATED` si el actor no es un usuario ni una service account. */
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
