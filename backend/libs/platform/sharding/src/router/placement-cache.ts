import type { Clock } from '@platform/kernel';
import type { TenantPlacement } from '../model/tenant-placement.js';
import type { RoutingCache } from '../ports/routing-cache.js';
import { LruMap } from '../lru-map.js';
import { ExpiringLru } from './expiring-lru.js';
import { PlacementCodec } from './placement-codec.js';
import type { SharedRecord } from './shared-record.js';

/** Parámetros de {@link PlacementCache}. */
export interface PlacementCacheSettings {
  readonly localTtlMs: number;
  readonly sharedTtlMs: number;
  readonly tombstoneTtlMs: number;
  /** Capacidad del caché en proceso y de las versiones mínimas aprendidas. */
  readonly maxPlacements: number;
}

/**
 * Caché de placements en dos niveles: LRU en proceso y `RoutingCache` compartido
 * opcional, con lápidas versionadas y la versión mínima aceptable por tenant.
 * Un fallo del caché compartido se informa a `onError` y nunca se propaga.
 */
export class PlacementCache {
  static readonly KEY_PREFIX = 'sharding:placement:';

  private readonly placements: ExpiringLru<TenantPlacement>;
  /** Versión mínima aceptable por tenant, aprendida de invalidaciones y cambios. */
  private readonly minVersions: LruMap<string, number>;

  constructor(
    private readonly settings: PlacementCacheSettings,
    private readonly clock: Clock,
    private readonly sharedCache: RoutingCache | undefined,
    private readonly onError: (error: unknown) => void,
  ) {
    this.placements = new ExpiringLru(settings.maxPlacements, clock);
    this.minVersions = new LruMap(settings.maxPlacements);
  }

  /** Placement vigente en proceso, o `undefined`. */
  local(tenantId: string): TenantPlacement | undefined {
    return this.placements.get(tenantId);
  }

  /**
   * Guarda un placement en proceso hasta `min(ahora + localTtlMs, sharedExpiresAt)` y
   * descarta la versión mínima aprendida si el placement ya la cumple.
   */
  remember(
    tenantId: string,
    placement: TenantPlacement,
    sharedExpiresAt: number,
  ): void {
    if (placement.version >= (this.minVersions.peek(tenantId) ?? 0)) {
      this.minVersions.delete(tenantId);
    }
    this.placements.set(
      tenantId,
      placement,
      Math.min(this.now() + this.settings.localTtlMs, sharedExpiresAt),
    );
  }

  /** Descarta el placement en proceso. */
  drop(tenantId: string): void {
    this.placements.delete(tenantId);
  }

  /** Instante hasta el cual vale lo que se escribe ahora en el nivel compartido; infinito si no hay caché compartido. */
  sharedExpiry(): number {
    return this.sharedCache !== undefined
      ? this.now() + this.settings.sharedTtlMs
      : Number.POSITIVE_INFINITY;
  }

  /** Lee y valida la clave del tenant en el caché compartido; `undefined` si no hay caché, falla o es inválida. */
  async readShared(tenantId: string): Promise<SharedRecord | undefined> {
    if (this.sharedCache === undefined) {
      return undefined;
    }
    try {
      return PlacementCodec.decode(
        await this.sharedCache.get(PlacementCache.KEY_PREFIX + tenantId),
      );
    } catch (error) {
      this.onError(error);
      return undefined;
    }
  }

  /**
   * Escribe un placement leído del directorio con `setIfNewer`. No escribe si no hay
   * caché compartido ni si la carga empezó hace `tombstoneTtlMs` o más (`loadStartedAt`):
   * una lápida escrita después de que empezó la carga ya podría haber expirado.
   */
  async writeShared(
    placement: TenantPlacement,
    expiresAt: number,
    loadStartedAt: number,
  ): Promise<void> {
    if (this.sharedCache === undefined) {
      return;
    }
    if (this.now() - loadStartedAt >= this.settings.tombstoneTtlMs) {
      return;
    }
    try {
      await this.sharedCache.setIfNewer(
        PlacementCache.KEY_PREFIX + placement.tenantId,
        PlacementCodec.encodeEntry({ placement, expiresAt }),
        PlacementCodec.cacheVersion(placement.version),
        this.settings.sharedTtlMs,
      );
    } catch (error) {
      this.onError(error);
    }
  }

  /** Escribe una lápida con la versión de caché dada y TTL `tombstoneTtlMs`. */
  async writeTombstone(tenantId: string, cacheVersion: number): Promise<void> {
    if (this.sharedCache === undefined) {
      return;
    }
    try {
      await this.sharedCache.setIfNewer(
        PlacementCache.KEY_PREFIX + tenantId,
        PlacementCodec.encodeTombstone({
          cacheVersion,
          expiresAt: this.now() + this.settings.tombstoneTtlMs,
        }),
        cacheVersion,
        this.settings.tombstoneTtlMs,
      );
    } catch (error) {
      this.onError(error);
    }
  }

  /** Sube la versión mínima aceptable del tenant (nunca la baja). */
  raiseMinVersion(tenantId: string, version: number): void {
    const current = this.minVersions.peek(tenantId) ?? 0;
    this.minVersions.set(tenantId, Math.max(current, version));
  }

  /** `true` si un cambio o invalidación anunció una versión mayor que `version`. */
  isOutdated(tenantId: string, version: number): boolean {
    return version < (this.minVersions.peek(tenantId) ?? 0);
  }

  private now(): number {
    return this.clock.now().getTime();
  }
}
