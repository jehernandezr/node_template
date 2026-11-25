import type { AccessGrant } from './access-grant.js';

/**
 * Source of truth for access: identity implements it in process with its
 * `access` facade, and the other services with the internal operation `GetUserAccess`.
 */
export abstract class AccessGrantSource {
  abstract fetch(tenantId: string, userId: string): Promise<AccessGrant>;
}
