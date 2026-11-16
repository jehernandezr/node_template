import type { Clock } from '@platform/kernel';
import { AuthenticationError } from '../errors/authentication.error.js';
import type { AuthStateReader } from '../state/auth-state-reader.js';
import { TtlLruCache } from '../state/ttl-lru-cache.js';
import type { AccessGrant } from './access-grant.js';
import type { AccessGrantSource } from './access-grant-source.js';
import { AccessResolver } from './access-resolver.js';
import type { CachedAccessOptions } from './cached-access.options.js';

/**
 * Lee el grant de la copia compartida `auth:access:{tid}:{uid}` y, si falta o
 * Valkey no responde, de `AccessGrantSource`. Guarda lo leído `options.ttlMs`
 * en memoria.
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
    // La copia de Valkey es opcional: si no responde o no tiene el grant, se sigue a la fuente.
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
