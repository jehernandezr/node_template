import type { AccessGrant } from '../access/access-grant.js';
import type { ApiKeyPrincipal } from '../api-keys/api-key-principal.js';
import type { Epoch } from './epoch.js';
import type { PermissionVersion } from './permission-version.js';

/**
 * Reads the shared `auth:*` state. It is the port services see;
 * `ValkeyAuthStateReader` implements it on Valkey and `CachedAuthStateReader`
 * wraps it with the local caches.
 */
export abstract class AuthStateReader {
  /**
   * `true` if `auth:revoked:{sid}` exists.
   * @param sessionId Session id.
   * @returns `true` when revoked.
   */
  abstract isSessionRevoked(sessionId: string): Promise<boolean>;

  /**
   * The revoked `sid` values still in force, in batches, read from `auth:revoked-index`
   * (score greater than now). Feeds the rebuild of the local Bloom.
   * @param signal Abort signal.
   * @returns The batches of session ids.
   */
  abstract revokedSessionIds(
    signal?: AbortSignal,
  ): AsyncIterable<readonly string[]>;

  /**
   * Reads the revocation epoch of a user.
   * @param userId User id.
   * @returns The epoch, or `undefined`.
   */
  abstract userEpoch(userId: string): Promise<Epoch | undefined>;

  /**
   * Reads the revocation epoch of a tenant.
   * @param tenantId Tenant id.
   * @returns The epoch, or `undefined`.
   */
  abstract tenantEpoch(tenantId: string): Promise<Epoch | undefined>;

  /**
   * `undefined` if either of the two `auth:pv:*` keys is missing.
   * @param tenantId Tenant id.
   * @param userId User id.
   * @returns The version, or `undefined`.
   */
  abstract permissionVersion(
    tenantId: string,
    userId: string,
  ): Promise<PermissionVersion | undefined>;

  /**
   * Reads the cached grant of a member.
   * @param tenantId Tenant id.
   * @param userId User id.
   * @returns The grant, or `undefined`.
   */
  abstract accessGrant(
    tenantId: string,
    userId: string,
  ): Promise<AccessGrant | undefined>;

  /**
   * The principal stored under the `secretHash` field of the `auth:apikey:{prefix}` hash.
   * @param prefix Key prefix.
   * @param secretHash SHA-256 of the secret.
   * @returns The principal, or `undefined`.
   */
  abstract apiKey(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined>;
}
