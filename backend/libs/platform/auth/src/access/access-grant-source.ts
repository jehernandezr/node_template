import type { AccessGrant } from './access-grant.js';

/**
 * Source of truth for access: identity implements it in process with its
 * `access` facade, and the other services with the internal operation `GetUserAccess`.
 */
export abstract class AccessGrantSource {
  /**
   * Reads the grant of a member from its source of truth.
   * @param tenantId Tenant of the member.
   * @param userId Member.
   * @returns The grant.
   */
  abstract fetch(tenantId: string, userId: string): Promise<AccessGrant>;
}
