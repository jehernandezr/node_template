import type { AccessGrant } from './access-grant.js';

/** Delivers the `AccessGrant` of a user in a tenant. */
export abstract class AccessResolver {
  /** @throws AuthenticationError (`PLATFORM.RESILIENCE.CIRCUIT_OPEN`) if there is no way to compute it. */
  abstract resolve(tenantId: string, userId: string): Promise<AccessGrant>;
}
