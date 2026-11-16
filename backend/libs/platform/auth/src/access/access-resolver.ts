import type { AccessGrant } from './access-grant.js';

/** Entrega el `AccessGrant` de un usuario en un tenant. */
export abstract class AccessResolver {
  /** @throws AuthenticationError (`PLATFORM.RESILIENCE.CIRCUIT_OPEN`) si no hay forma de calcularlo. */
  abstract resolve(tenantId: string, userId: string): Promise<AccessGrant>;
}
