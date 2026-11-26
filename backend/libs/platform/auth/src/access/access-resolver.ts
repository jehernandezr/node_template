import type { AccessGrant } from './access-grant.js';

/** Delivers the `AccessGrant` of a user in a tenant. */
export abstract class AccessResolver {
  /**
   * Resolves the grant of a member, from the cache or from its source.
   * @param tenantId Tenant of the member.
   * @param userId Member.
   * @returns The grant.
   * @throws AuthenticationError (`PLATFORM.RESILIENCE.CIRCUIT_OPEN`) if there is no way to compute it.
   */
  abstract resolve(tenantId: string, userId: string): Promise<AccessGrant>;
}
