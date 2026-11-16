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
 * `AuthStateReader` que usan los verificadores. Envuelve al lector de Valkey
 * (`source`) con:
 * - el Bloom local de sesiones revocadas, que evita ir a Valkey por casi toda petición;
 * - una caché de `options.ttlMs` para épocas y versiones de permisos, que sirve el último valor
 *   conocido, aunque haya vencido, cuando Valkey no responde.
 * Si Valkey falla y no hay ningún valor, lanza `AuthenticationError.stateUnavailable`:
 * nunca se acepta un token sin poder revisar la revocación.
 * `accessGrant`, `apiKey` y `revokedSessionIds` pasan directo: sus resolutores
 * tienen su propia caché y la reconstrucción del Bloom no se cachea.
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

  async isSessionRevoked(sessionId: string): Promise<boolean> {
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

  revokedSessionIds(signal?: AbortSignal): AsyncIterable<readonly string[]> {
    return this.source.revokedSessionIds(signal);
  }

  userEpoch(userId: string): Promise<Epoch | undefined> {
    return this.cached(this.userEpochs, userId, () =>
      this.source.userEpoch(userId),
    );
  }

  tenantEpoch(tenantId: string): Promise<Epoch | undefined> {
    return this.cached(this.tenantEpochs, tenantId, () =>
      this.source.tenantEpoch(tenantId),
    );
  }

  permissionVersion(
    tenantId: string,
    userId: string,
  ): Promise<PermissionVersion | undefined> {
    return this.cached(this.versions, `${tenantId}:${userId}`, () =>
      this.source.permissionVersion(tenantId, userId),
    );
  }

  accessGrant(
    tenantId: string,
    userId: string,
  ): Promise<AccessGrant | undefined> {
    return this.source.accessGrant(tenantId, userId);
  }

  apiKey(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined> {
    return this.source.apiKey(prefix, secretHash);
  }

  /**
   * Sirve lo guardado si está fresco; si no, lo pide a `load`. Cuando `load` falla
   * se devuelve el último valor conocido aunque haya vencido, porque una época
   * vencida casi nunca cambió; sin ningún valor previo, se rechaza.
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
      if (entry !== undefined) {
        return entry.value;
      }
      throw AuthenticationError.stateUnavailable(error);
    }
  }
}
