import type { Clock } from '@platform/kernel';
import type { TenantPlacement } from '../model/tenant-placement.js';
import type { RoutingCache } from '../ports/routing-cache.js';
import { LruMap } from '../lru-map.js';
import { ExpiringLru } from './expiring-lru.js';
import { PlacementCodec } from './placement-codec.js';
import type { SharedRecord } from './shared-record.js';

/** Parameters of {@link PlacementCache}. */
export interface PlacementCacheSettings {
  readonly localTtlMs: number;
  readonly sharedTtlMs: number;
  readonly tombstoneTtlMs: number;
  /** Capacity of the in-process cache and of the learned minimum versions. */
  readonly maxPlacements: number;
}

/**
 * Two-level placement cache: in-process LRU and optional shared `RoutingCache`,
 * with versioned tombstones and the minimum acceptable version per tenant.
 * A shared cache failure is reported to `onError` and never propagates.
 */
export class PlacementCache {
  static readonly KEY_PREFIX = 'sharding:placement:';

  private readonly placements: ExpiringLru<TenantPlacement>;
  /** Minimum acceptable version per tenant, learned from invalidations and changes. */
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

  /** Current in-process placement, or `undefined`. */
  local(tenantId: string): TenantPlacement | undefined {
    return this.placements.get(tenantId);
  }

  /**
   * Stores a placement in process until `min(now + localTtlMs, sharedExpiresAt)` and
   * discards the learned minimum version if the placement already meets it.
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

  /** Discards the in-process placement. */
  drop(tenantId: string): void {
    this.placements.delete(tenantId);
  }

  /** Instant until which what is written now to the shared level is valid; infinity if there is no shared cache. */
  sharedExpiry(): number {
    return this.sharedCache !== undefined
      ? this.now() + this.settings.sharedTtlMs
      : Number.POSITIVE_INFINITY;
  }

  /** Reads and validates the tenant key in the shared cache; `undefined` if there is no cache, it fails or it is invalid. */
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
   * Writes a placement read from the directory with `setIfNewer`. Does not write if there is no
   * shared cache or if the load started `tombstoneTtlMs` or more ago (`loadStartedAt`):
   * a tombstone written after the load started could already have expired.
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

  /** Writes a tombstone with the given cache version and TTL `tombstoneTtlMs`. */
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

  /** Raises the tenant's minimum acceptable version (never lowers it). */
  raiseMinVersion(tenantId: string, version: number): void {
    const current = this.minVersions.peek(tenantId) ?? 0;
    this.minVersions.set(tenantId, Math.max(current, version));
  }

  /** `true` if a change or invalidation announced a version higher than `version`. */
  isOutdated(tenantId: string, version: number): boolean {
    return version < (this.minVersions.peek(tenantId) ?? 0);
  }

  private now(): number {
    return this.clock.now().getTime();
  }
}
