import type { Clock } from '@platform/kernel';
import { nowMs, toClock, type ShardingClock } from './clock.js';
import {
  ShardingError,
  ShardingErrorCode,
  WrongRegionError,
} from './errors.js';
import type { DirectoryStore, RoutingCache } from './ports.js';
import {
  decodeSharedRecord,
  encodeSharedEntry,
  encodeTombstone,
  placementCacheVersion,
  UNVERSIONED_TOMBSTONE_VERSION,
  type SharedPlacementEntry,
  type SharedRecord,
} from './placement-codec.js';
import {
  ConsistentHashStrategy,
  type ShardingStrategy,
} from './sharding-strategy.js';
import {
  ShardAccess,
  ShardKey,
  TenantStatus,
  type ResolvedShard,
  type TenantPlacement,
} from './types.js';

/** Options for {@link ShardRouter}. */
export interface ShardRouterOptions {
  readonly directory: DirectoryStore;
  /** Cache shared across processes. Optional. Failures fall back to the directory. */
  readonly sharedCache?: RoutingCache;
  /** In-process TTL for placements and instances. Default 60 s. Placements never outlive their shared entry. */
  readonly localTtlMs?: number;
  /** TTL of placements written to the shared cache. Default 300 s. */
  readonly sharedTtlMs?: number;
  /**
   * TTL of the tombstone `invalidate` leaves in the shared cache. Default 30 s. A placement load that takes
   * this long or longer is not written to the shared cache, so no invalidation it overlapped can be undone.
   */
  readonly tombstoneTtlMs?: number;
  /**
   * Time source. Default the system clock. A function returning epoch milliseconds is still accepted
   * but deprecated.
   */
  readonly clock?: ShardingClock;
  /** Picks the shard inside a group with more than one shard. Default: consistent hashing. */
  readonly strategy?: ShardingStrategy;
  /** Region served by this process. Placements in other regions throw `WrongRegion`. */
  readonly currentRegion?: string;
  /** Receives shared cache failures. A failing cache never fails a resolve. */
  readonly onCacheError?: (error: unknown) => void;
}

/** Input of {@link ShardRouter.resolve}. */
export interface ResolveRequest {
  readonly tenantId: string;
  readonly keyKind: ShardKey;
  /** Required unless `keyKind` is `ShardKey.Tenant`. */
  readonly keyValue?: string;
  readonly access: ShardAccess;
}

/** Options of {@link ShardRouter.invalidate}. */
export interface InvalidateOptions {
  /**
   * Placement version just committed to the directory. With it the tombstone refuses every older version
   * and still lets this one be cached. Without it the tombstone is placed above the highest version this
   * router can see, or refuses every write until it expires when no version is known.
   */
  readonly version?: number;
}

interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

interface InFlightLoad {
  readonly generation: number;
  readonly promise: Promise<TenantPlacement>;
}

const PLACEMENT_CACHE_PREFIX = 'sharding:placement:';

const tenantGeneration = (tenantId: string): string => `tenant:${tenantId}`;
const shardGeneration = (logicalShard: string): string =>
  `shard:${logicalShard}`;

function readEntry<T>(
  entries: Map<string, CacheEntry<T>>,
  key: string,
  now: number,
): T | undefined {
  const entry = entries.get(key);
  if (entry === undefined) {
    return undefined;
  }
  if (now >= entry.expiresAt) {
    entries.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Cache version of the tombstone that replaces a placement: above every version this router can see, and
 * at least `2N − 1` when the caller gives the committed version N (refuses below N, accepts N).
 */
function tombstoneVersion(
  local: TenantPlacement | undefined,
  shared: SharedRecord | undefined,
  committedVersion: number | undefined,
): number {
  const candidates: number[] = [];
  if (local !== undefined) {
    candidates.push(placementCacheVersion(local.version) + 1);
  }
  if (shared?.kind === 'placement') {
    candidates.push(placementCacheVersion(shared.entry.placement.version) + 1);
  } else if (shared?.kind === 'tombstone') {
    candidates.push(shared.tombstone.cacheVersion + 1);
  }
  if (committedVersion !== undefined) {
    candidates.push(placementCacheVersion(committedVersion) - 1);
  }
  if (candidates.length === 0) {
    return UNVERSIONED_TOMBSTONE_VERSION;
  }
  return Math.min(Math.max(...candidates), Number.MAX_SAFE_INTEGER);
}

function checkWritable(tenantId: string, status: TenantStatus): void {
  if (status === TenantStatus.Active) {
    return;
  }
  if (status === TenantStatus.Migrating) {
    throw new ShardingError(
      ShardingErrorCode.TenantMigrating,
      'Tenant is migrating; writes are blocked until the move completes',
      { details: { tenantId } },
    );
  }
  throw new ShardingError(
    ShardingErrorCode.TenantNotWritable,
    'Tenant status does not allow writes',
    { details: { tenantId, status: String(status) } },
  );
}

/**
 * Routes a request to its physical instance: tenant → region → shard group → logical shard → instance.
 *
 * Keys: tenant ids and routing keys are lowercased before use. The directory must store lowercase ids.
 *
 * Placement lookups go through the in-process map, then the shared cache, then the directory.
 * Concurrent misses for one tenant share one load. Every `invalidate` bumps a per-tenant generation:
 * a load that started before it in this process is returned to its caller but never cached here.
 * Across processes, `invalidate` leaves a versioned tombstone in the shared cache instead of deleting the
 * key; `setIfNewer` refuses the old placement that a load in flight elsewhere tries to write back.
 *
 * Group changes: adding a shard to a group is only valid through a move saga with the tenant in
 * Migrating. The new placement version gets a fresh ring, and writes stay blocked until the move completes.
 */
export class ShardRouter {
  private readonly directory: DirectoryStore;
  private readonly sharedCache: RoutingCache | undefined;
  private readonly localTtlMs: number;
  private readonly sharedTtlMs: number;
  private readonly tombstoneTtlMs: number;
  private readonly clock: Clock;
  private readonly strategy: ShardingStrategy;
  private readonly currentRegion: string | undefined;
  private readonly onCacheError: (error: unknown) => void;
  private readonly placements = new Map<string, CacheEntry<TenantPlacement>>();
  private readonly instances = new Map<string, CacheEntry<string>>();
  private readonly generations = new Map<string, number>();
  private readonly inflight = new Map<string, InFlightLoad>();

  constructor(options: ShardRouterOptions) {
    this.directory = options.directory;
    this.sharedCache = options.sharedCache;
    this.localTtlMs = options.localTtlMs ?? 60_000;
    this.sharedTtlMs = options.sharedTtlMs ?? 300_000;
    this.tombstoneTtlMs = options.tombstoneTtlMs ?? 30_000;
    this.clock = toClock(options.clock);
    this.strategy = options.strategy ?? new ConsistentHashStrategy();
    this.currentRegion = options.currentRegion;
    this.onCacheError = options.onCacheError ?? (() => undefined);
  }

  /**
   * Resolves the physical instance for a request.
   * @throws ShardingError `KeyMissing`, `UnknownTenant`, `UnknownShard`, `TenantMigrating` or `TenantNotWritable`.
   * @throws WrongRegionError when the tenant lives in another region.
   */
  async resolve(request: ResolveRequest): Promise<ResolvedShard> {
    if (!request.tenantId) {
      throw new ShardingError(
        ShardingErrorCode.KeyMissing,
        'tenantId is required',
      );
    }
    const tenantId = request.tenantId.toLowerCase();
    const rawKey =
      request.keyKind === ShardKey.Tenant ? tenantId : request.keyValue;
    if (!rawKey) {
      throw new ShardingError(
        ShardingErrorCode.KeyMissing,
        `keyValue is required for key kind "${request.keyKind}"`,
      );
    }
    const routingKey = rawKey.toLowerCase();

    const placement = await this.getPlacement(tenantId);
    if (
      this.currentRegion !== undefined &&
      placement.region !== this.currentRegion
    ) {
      throw new WrongRegionError(placement.region);
    }
    if (request.access === ShardAccess.Write) {
      checkWritable(tenantId, placement.status);
    }
    const logicalShard = this.selectLogicalShard(placement, routingKey);
    const instance = await this.getInstance(logicalShard);

    return {
      tenantId,
      region: placement.region,
      logicalShard,
      instance,
      status: placement.status,
    };
  }

  /** Thin helper: throws the same errors as a write `resolve` for a result already in hand. */
  assertWritable(resolved: ResolvedShard): void {
    checkWritable(resolved.tenantId, resolved.status);
  }

  /**
   * Drops a tenant's placement from the in-process cache and the cached instances of its shard group, and
   * replaces the shared entry with a versioned tombstone. The tombstone outranks the placement it replaces,
   * so a read already in flight (in this or another process) cannot write the old placement back.
   * Works when the local placement already expired: the group is then read from the shared cache.
   */
  async invalidate(
    tenantId: string,
    options: InvalidateOptions = {},
  ): Promise<void> {
    const id = tenantId.toLowerCase();
    const key = PLACEMENT_CACHE_PREFIX + id;
    this.bump(tenantGeneration(id));
    const local = readEntry(this.placements, id, this.now());
    this.placements.delete(id);
    const shared = await this.readSharedRecord(key);
    const group =
      local?.shardGroup ??
      (shared?.kind === 'placement' ? shared.entry.placement.shardGroup : []);
    for (const shard of group) {
      this.invalidateShard(shard);
    }
    await this.writeTombstone(
      key,
      tombstoneVersion(local, shared, options.version),
    );
  }

  /** Clears the cached instance of a logical shard, whatever placements reference it. */
  invalidateShard(logicalShard: string): void {
    this.bump(shardGeneration(logicalShard));
    this.instances.delete(logicalShard);
  }

  private async getPlacement(tenantId: string): Promise<TenantPlacement> {
    const local = readEntry(this.placements, tenantId, this.now());
    if (local !== undefined) {
      return local;
    }
    const generation = this.generationOf(tenantGeneration(tenantId));
    const pending = this.inflight.get(tenantId);
    if (pending !== undefined && pending.generation === generation) {
      return pending.promise;
    }
    const promise: Promise<TenantPlacement> = this.loadPlacement(
      tenantId,
      generation,
    ).finally(() => {
      if (this.inflight.get(tenantId)?.promise === promise) {
        this.inflight.delete(tenantId);
      }
    });
    this.inflight.set(tenantId, { generation, promise });
    return promise;
  }

  private async loadPlacement(
    tenantId: string,
    generation: number,
  ): Promise<TenantPlacement> {
    const startedAt = this.now();
    const key = PLACEMENT_CACHE_PREFIX + tenantId;
    const record = await this.readSharedRecord(key);
    const shared = record?.kind === 'placement' ? record.entry : undefined;
    if (shared !== undefined && this.now() < shared.expiresAt) {
      if (this.isCurrent(tenantId, generation)) {
        this.rememberPlacement(tenantId, shared.placement, shared.expiresAt);
      }
      return shared.placement;
    }

    const placement = await this.directory.getPlacement(tenantId);
    if (placement === undefined) {
      throw new ShardingError(
        ShardingErrorCode.UnknownTenant,
        'No placement for tenant',
        { details: { tenantId } },
      );
    }
    if (!this.isCurrent(tenantId, generation)) {
      // Invalidated while the directory was read: answer the caller, cache nothing.
      return placement;
    }
    const sharedExpiresAt = this.sharedCache
      ? this.now() + this.sharedTtlMs
      : Number.POSITIVE_INFINITY;
    this.rememberPlacement(tenantId, placement, sharedExpiresAt);
    await this.writeShared(
      key,
      { placement, expiresAt: sharedExpiresAt },
      startedAt,
    );
    return placement;
  }

  private rememberPlacement(
    tenantId: string,
    placement: TenantPlacement,
    sharedExpiresAt: number,
  ): void {
    this.placements.set(tenantId, {
      value: placement,
      expiresAt: Math.min(this.now() + this.localTtlMs, sharedExpiresAt),
    });
  }

  /**
   * Writes a placement read from the directory. `setIfNewer` refuses it when a tombstone or a newer placement
   * is stored. A load that outlived the tombstone TTL is not written: a tombstone written after the load
   * started could already be gone.
   */
  private async writeShared(
    key: string,
    entry: SharedPlacementEntry,
    startedAt: number,
  ): Promise<void> {
    if (this.sharedCache === undefined) {
      return;
    }
    if (this.now() - startedAt >= this.tombstoneTtlMs) {
      return;
    }
    try {
      await this.sharedCache.setIfNewer(
        key,
        encodeSharedEntry(entry),
        placementCacheVersion(entry.placement.version),
        this.sharedTtlMs,
      );
    } catch (error) {
      this.onCacheError(error);
    }
  }

  private async writeTombstone(
    key: string,
    cacheVersion: number,
  ): Promise<void> {
    if (this.sharedCache === undefined) {
      return;
    }
    try {
      await this.sharedCache.setIfNewer(
        key,
        encodeTombstone({
          cacheVersion,
          expiresAt: this.now() + this.tombstoneTtlMs,
        }),
        cacheVersion,
        this.tombstoneTtlMs,
      );
    } catch (error) {
      this.onCacheError(error);
    }
  }

  private async readSharedRecord(
    key: string,
  ): Promise<SharedRecord | undefined> {
    if (this.sharedCache === undefined) {
      return undefined;
    }
    try {
      return decodeSharedRecord(await this.sharedCache.get(key));
    } catch (error) {
      this.onCacheError(error);
      return undefined;
    }
  }

  private async getInstance(logicalShard: string): Promise<string> {
    const cached = readEntry(this.instances, logicalShard, this.now());
    if (cached !== undefined) {
      return cached;
    }
    const generation = this.generationOf(shardGeneration(logicalShard));
    const instance = await this.directory.getInstance(logicalShard);
    if (!instance) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'No instance for logical shard',
        { details: { logicalShard } },
      );
    }
    if (this.generationOf(shardGeneration(logicalShard)) === generation) {
      this.instances.set(logicalShard, {
        value: instance,
        expiresAt: this.now() + this.localTtlMs,
      });
    }
    return instance;
  }

  private selectLogicalShard(
    placement: TenantPlacement,
    routingKey: string,
  ): string {
    const group = placement.shardGroup;
    const [first] = group;
    if (first === undefined) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'Tenant has no shards assigned',
        { details: { tenantId: placement.tenantId } },
      );
    }
    if (group.length === 1) {
      return first;
    }
    return this.strategy.locate(routingKey, group, placement.version);
  }

  private now(): number {
    return nowMs(this.clock);
  }

  private bump(key: string): void {
    this.generations.set(key, this.generationOf(key) + 1);
  }

  private generationOf(key: string): number {
    return this.generations.get(key) ?? 0;
  }

  private isCurrent(tenantId: string, generation: number): boolean {
    return this.generationOf(tenantGeneration(tenantId)) === generation;
  }
}
