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
  /** `true` if `auth:revoked:{sid}` exists. */
  abstract isSessionRevoked(sessionId: string): Promise<boolean>;

  /**
   * The revoked `sid` values still in force, in batches, read from `auth:revoked-index`
   * (score greater than now). Feeds the rebuild of the local Bloom.
   */
  abstract revokedSessionIds(
    signal?: AbortSignal,
  ): AsyncIterable<readonly string[]>;

  abstract userEpoch(userId: string): Promise<Epoch | undefined>;

  abstract tenantEpoch(tenantId: string): Promise<Epoch | undefined>;

  /** `undefined` if either of the two `auth:pv:*` keys is missing. */
  abstract permissionVersion(
    tenantId: string,
    userId: string,
  ): Promise<PermissionVersion | undefined>;

  abstract accessGrant(
    tenantId: string,
    userId: string,
  ): Promise<AccessGrant | undefined>;

  /** The principal stored under the `secretHash` field of the `auth:apikey:{prefix}` hash. */
  abstract apiKey(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined>;
}
