import type { Clock } from '@platform/kernel';
import type { AccessGrant } from '../access/access-grant.js';
import type { ApiKeyPrincipal } from '../api-keys/api-key-principal.js';
import { AuthenticationError } from '../errors/authentication.error.js';
import { AuthStateReader } from './auth-state-reader.js';
import type { CachedAuthStateOptions } from './cached-auth-state.options.js';
import type { Epoch } from './epoch.js';
import type { PermissionVersion } from './permission-version.js';
import type { RevokedSessionRegistry } from './revoked-session-registry.js';
import { TtlLruCache } from './ttl-lru-cache.js';

/**
 * `AuthStateReader` used by the verifiers. Wraps the Valkey reader
 * (`source`) with:
 * - the local Bloom of revoked sessions, which avoids going to Valkey on almost every request;
 * - an `options.ttlMs` cache for epochs and permission versions.
 * If Valkey fails and the cached value is missing or expired, throws `AuthenticationError.stateUnavailable`
 * (503 `PLATFORM.DEPENDENCY.UNAVAILABLE`): a token is never accepted on a revocation state older than the ttl.
 * `accessGrant`, `apiKey` and `revokedSessionIds` pass straight through: their resolvers
 * have their own cache and the Bloom rebuild is not cached.
 */
export class CachedAuthStateReader extends AuthStateReader {
  private readonly userEpochs: TtlLruCache<Epoch | undefined>;
  private readonly tenantEpochs: TtlLruCache<Epoch | undefined>;
  private readonly versions: TtlLruCache<PermissionVersion | undefined>;

  constructor(
    private readonly source: AuthStateReader,
    private readonly revoked: RevokedSessionRegistry,
    private readonly clock: Clock,
    private readonly options: CachedAuthStateOptions,
  ) {
    super();
    this.userEpochs = new TtlLruCache(options.maxEntries);
    this.tenantEpochs = new TtlLruCache(options.maxEntries);
    this.versions = new TtlLruCache(options.maxEntries);
  }

  override async isSessionRevoked(sessionId: string): Promise<boolean> {
    if (
      this.revoked.isWarm() &&
      !(await this.revoked.mightContain(sessionId))
    ) {
      return false;
    }
    try {
      return await this.source.isSessionRevoked(sessionId);
    } catch (error) {
      throw AuthenticationError.stateUnavailable(error);
    }
  }

  override revokedSessionIds(
    signal?: AbortSignal,
  ): AsyncIterable<readonly string[]> {
    return this.source.revokedSessionIds(signal);
  }

  override userEpoch(userId: string): Promise<Epoch | undefined> {
    return this.cached(this.userEpochs, userId, () =>
      this.source.userEpoch(userId),
    );
  }

  override tenantEpoch(tenantId: string): Promise<Epoch | undefined> {
    return this.cached(this.tenantEpochs, tenantId, () =>
      this.source.tenantEpoch(tenantId),
    );
  }

  override permissionVersion(
    tenantId: string,
    userId: string,
  ): Promise<PermissionVersion | undefined> {
    return this.cached(this.versions, `${tenantId}:${userId}`, () =>
      this.source.permissionVersion(tenantId, userId),
    );
  }

  override accessGrant(
    tenantId: string,
    userId: string,
  ): Promise<AccessGrant | undefined> {
    return this.source.accessGrant(tenantId, userId);
  }

  override apiKey(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined> {
    return this.source.apiKey(prefix, secretHash);
  }

  /**
   * Serves the stored value if fresh; otherwise requests it from `load`. When `load` fails
   * the last known value is returned even if expired, because an expired epoch
   * has almost never changed; with no previous value, it rejects.
   */
  private async cached<V>(
    cache: TtlLruCache<V>,
    key: string,
    load: () => Promise<V>,
  ): Promise<V> {
    const nowMs = this.clock.now().getTime();
    const entry = cache.get(key);
    if (
      entry !== undefined &&
      cache.isFresh(entry, nowMs, this.options.ttlMs)
    ) {
      return entry.value;
    }
    try {
      const value = await load();
      cache.set(key, value, nowMs);
      return value;
    } catch (error) {
      throw AuthenticationError.stateUnavailable(error);
    }
  }
}
