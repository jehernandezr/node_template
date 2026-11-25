import type { Clock } from '@platform/kernel';
import { AuthenticationError } from '../errors/authentication.error.js';
import type { AuthStateReader } from '../state/auth-state-reader.js';
import { TtlLruCache } from '../state/ttl-lru-cache.js';
import type { AccessGrant } from './access-grant.js';
import type { AccessGrantSource } from './access-grant-source.js';
import { AccessResolver } from './access-resolver.js';
import type { CachedAccessOptions } from './cached-access.options.js';

/**
 * Reads the grant from the shared copy `auth:access:{tid}:{uid}` and, if it is missing or
 * Valkey does not respond, from `AccessGrantSource`. Keeps what it read in memory for
 * `options.ttlMs`.
 */
export class CachedAccessResolver extends AccessResolver {
  private readonly grants: TtlLruCache<AccessGrant>;

  constructor(
    private readonly state: AuthStateReader,
    private readonly source: AccessGrantSource,
    private readonly clock: Clock,
    private readonly options: CachedAccessOptions,
  ) {
    super();
    this.grants = new TtlLruCache(options.maxEntries);
  }

  async resolve(tenantId: string, userId: string): Promise<AccessGrant> {
    const nowMs = this.clock.now().getTime();
    const key = `${tenantId}:${userId}`;
    const entry = this.grants.get(key);
    if (
      entry !== undefined &&
      this.grants.isFresh(entry, nowMs, this.options.ttlMs)
    ) {
      return entry.value;
    }
    // The Valkey copy is optional: if it does not respond or does not have the grant, it falls through to the source.
    let grant: AccessGrant | undefined;
    try {
      grant = await this.state.accessGrant(tenantId, userId);
    } catch {
      grant = undefined;
    }
    if (grant === undefined) {
      try {
        grant = await this.source.fetch(tenantId, userId);
      } catch (error) {
        if (entry !== undefined) {
          return entry.value;
        }
        throw AuthenticationError.stateUnavailable(error);
      }
    }
    this.grants.set(key, grant, nowMs);
    return grant;
  }
}
