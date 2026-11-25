import type { RevocationReason } from '@contracts/identity';
import type { AccessGrant } from '../access/access-grant.js';
import type { ApiKeyPrincipal } from '../api-keys/api-key-principal.js';
import type { Epoch } from './epoch.js';

/** Writes of the shared `auth:*` state. Only identity uses it. */
export abstract class AuthStateWriter {
  /**
   * Marks the session as revoked for `ttlMs` (the remaining life of the access
   * token plus 30 s), adds it to the index and announces it on the revocations
   * channel. Writing it again is harmless.
   * @param sessionId Revoked session.
   * @param ttlMs How long the mark lives; nothing is written if it is not positive.
   * @param reason Why it was revoked.
   */
  abstract revokeSession(
    sessionId: string,
    ttlMs: number,
    reason: RevocationReason,
  ): Promise<void>;

  /**
   * Stores the revocation epoch of a user.
   * @param userId User.
   * @param epoch Cut-off instant and suspension.
   */
  abstract setUserEpoch(userId: string, epoch: Epoch): Promise<void>;

  /**
   * Stores the revocation epoch of a tenant.
   * @param tenantId Tenant.
   * @param epoch Cut-off instant and suspension.
   */
  abstract setTenantEpoch(tenantId: string, epoch: Epoch): Promise<void>;

  /**
   * Raises a permission version: the one of the user in the tenant with `userId`, the one of the tenant
   * without it. A version lower than or equal to the stored one is ignored, so writes that arrive late or
   * twice never move a version back.
   * @param tenantId Tenant.
   * @param userId User, or `undefined` for the tenant version.
   * @param version New version, a non-negative safe integer.
   */
  abstract setPermissionVersion(
    tenantId: string,
    userId: string | undefined,
    version: number,
  ): Promise<void>;

  /**
   * Stores the grant with a 15 minute TTL.
   * @param tenantId Tenant.
   * @param userId User.
   * @param grant Effective access.
   */
  abstract putAccessGrant(
    tenantId: string,
    userId: string,
    grant: AccessGrant,
  ): Promise<void>;

  /**
   * Stores the principal under the hash of the secret, with a 60 second TTL.
   * @param prefix Prefix of the key.
   * @param secretHash Hash of the secret.
   * @param principal Principal of the key.
   */
  abstract putApiKey(
    prefix: string,
    secretHash: string,
    principal: ApiKeyPrincipal,
  ): Promise<void>;

  /**
   * Deletes `auth:apikey:{prefix}`: that is how an API key is revoked.
   * @param prefix Prefix of the key.
   */
  abstract dropApiKey(prefix: string): Promise<void>;
}
