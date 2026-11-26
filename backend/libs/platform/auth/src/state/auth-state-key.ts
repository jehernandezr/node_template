/**
 * Keys and channel of the shared authentication state in Valkey (ADR 0022).
 * They go without the service prefix: identity writes and everyone reads. Pure
 * stateless utility.
 */
export class AuthStateKey {
  /** First segment of every key and channel; the Valkey ACL is defined over `auth:*`. */
  static readonly NAMESPACE = 'auth';

  /** Zset of `sid` with their expiry as score: source for rebuilding the local Bloom. */
  static readonly REVOKED_INDEX = 'auth:revoked-index';

  /** Pub/sub channel with one notice per revoked session; the message is the `sid`. */
  static readonly REVOCATIONS_CHANNEL = 'auth:revocations';

  /**
   * `auth:revoked:{sid}`: reason for the revocation.
   * @param sessionId Session id.
   * @returns The key.
   */
  static revoked(sessionId: string): string {
    return `auth:revoked:${sessionId}`;
  }

  /**
   * `auth:epoch:user:{userId}`.
   * @param userId User id.
   * @returns The key.
   */
  static userEpoch(userId: string): string {
    return `auth:epoch:user:${userId}`;
  }

  /**
   * `auth:epoch:tenant:{tenantId}`.
   * @param tenantId Tenant id.
   * @returns The key.
   */
  static tenantEpoch(tenantId: string): string {
    return `auth:epoch:tenant:${tenantId}`;
  }

  /**
   * `auth:pv:tenant:{tenantId}`.
   * @param tenantId Tenant id.
   * @returns The key.
   */
  static tenantPermissionVersion(tenantId: string): string {
    return `auth:pv:tenant:${tenantId}`;
  }

  /**
   * `auth:pv:user:{tenantId}:{userId}`.
   * @param tenantId Tenant id.
   * @param userId User id.
   * @returns The key.
   */
  static userPermissionVersion(tenantId: string, userId: string): string {
    return `auth:pv:user:${tenantId}:${userId}`;
  }

  /**
   * `auth:access:{tenantId}:{userId}`.
   * @param tenantId Tenant id.
   * @param userId User id.
   * @returns The key.
   */
  static access(tenantId: string, userId: string): string {
    return `auth:access:${tenantId}:${userId}`;
  }

  /**
   * `auth:apikey:{prefix}`: hash with one field per `sha256(secret)`.
   * @param prefix Key prefix.
   * @returns The key.
   */
  static apiKey(prefix: string): string {
    return `auth:apikey:${prefix}`;
  }
}
