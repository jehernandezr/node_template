import type { Clock } from '@platform/kernel';
import type { Deadline } from '@platform/primitives';
import { nowMs, toClock, type ShardingClock } from './clock.js';
import {
  ShardingError,
  ShardingErrorCode,
  WrongRegionError,
} from './errors.js';
import { LookupBudget } from './lookup-budget.js';
import { assertCapacity, InvalidationLog, LruMap } from './lru-map.js';
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

/** UUIDv7 (RFC 9562 variant: 8, 9, a or b), the format of every tenant id. Case-insensitive. */
export const TENANT_ID_UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Longest tenant id accepted, whatever `tenantIdPattern` says. */
export const MAX_TENANT_ID_LENGTH = 64;

/** Default limits of {@link ShardRouter}. */
export const SHARD_ROUTER_DEFAULTS = {
  localTtlMs: 60_000,
  sharedTtlMs: 300_000,
  tombstoneTtlMs: 30_000,
  maxPlacements: 10_000,
  maxInstances: 10_000,
  maxKeyLength: 256,
} as const;

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
  /**
   * Most tenants kept in the in-process placement cache, and most tracked invalidations and loads in flight.
   * The least recently used tenant is evicted first. Default 10 000.
   */
  readonly maxPlacements?: number;
  /** Most logical shards kept in the in-process instance cache (least recently used evicted). Default 10 000. */
  readonly maxInstances?: number;
  /** Longest routing key (`keyValue`) accepted, in UTF-16 code units. Default 256. */
  readonly maxKeyLength?: number;
  /**
   * Format tenant ids must match, without the `g` or `y` flags. Default {@link TENANT_ID_UUID_V7}. Ids longer
   * than {@link MAX_TENANT_ID_LENGTH} are refused whatever the pattern.
   */
  readonly tenantIdPattern?: RegExp;
}

/** Input of {@link ShardRouter.resolve}. */
export interface ResolveRequest {
  /** UUIDv7 by default (see `tenantIdPattern`). */
  readonly tenantId: string;
  readonly keyKind: ShardKey;
  /** Required unless `keyKind` is `ShardKey.Tenant`. At most `maxKeyLength` characters. */
  readonly keyValue?: string;
  readonly access: ShardAccess;
  /** Time budget of the lookup. When it passes, `resolve` rejects with `DeadlineExceededError`. */
  readonly deadline?: Deadline;
  /** Cancels the lookup. `resolve` rejects with the signal's `reason`. */
  readonly signal?: AbortSignal;
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
  /** Invalidation sequence when the load started. */
  readonly startedAt: number;
  readonly promise: Promise<TenantPlacement>;
}

const PLACEMENT_CACHE_PREFIX = 'sharding:placement:';

function readEntry<T>(
  entries: LruMap<string, CacheEntry<T>>,
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

function invalidOption(option: string, expectation: string): ShardingError {
  return new ShardingError(
    ShardingErrorCode.InvalidConfiguration,
    `${option} must be ${expectation}`,
    { details: { option } },
  );
}

function assertTtl(option: string, value: number, allowZero: boolean): void {
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    throw invalidOption(
      option,
      allowZero ? 'a finite number >= 0' : 'a finite number > 0',
    );
  }
}

/**
 * Routes a request to its physical instance: tenant → region → shard group → logical shard → instance.
 *
 * Keys: tenant ids (UUIDv7 by default) and routing keys are lowercased before use. The directory must
 * store lowercase ids. Routing keys longer than `maxKeyLength` are refused.
 *
 * Placement lookups go through the in-process map, then the shared cache, then the directory.
 * Concurrent misses for one tenant share one load. Every `invalidate` records a sequence number:
 * a load that started before it in this process is returned to its caller but never cached here.
 * Across processes, `invalidate` leaves a versioned tombstone in the shared cache instead of deleting the
 * key; `setIfNewer` refuses the old placement that a load in flight elsewhere tries to write back.
 *
 * Memory: placements, instances, invalidation records and loads in flight are bounded by `maxPlacements`
 * and `maxInstances`; the least recently used entries are evicted first.
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
  private readonly maxPlacements: number;
  private readonly maxKeyLength: number;
  private readonly tenantIdPattern: RegExp;
  private readonly placements: LruMap<string, CacheEntry<TenantPlacement>>;
  private readonly instances: LruMap<string, CacheEntry<string>>;
  private readonly tenantInvalidations: InvalidationLog;
  private readonly shardInvalidations: InvalidationLog;
  private readonly inflight = new Map<string, InFlightLoad>();
  private sequence = 0;

  /** @throws ShardingError `InvalidConfiguration` when a TTL, limit or pattern is invalid. */
  constructor(options: ShardRouterOptions) {
    const defaults = SHARD_ROUTER_DEFAULTS;
    this.directory = options.directory;
    this.sharedCache = options.sharedCache;
    this.localTtlMs = options.localTtlMs ?? defaults.localTtlMs;
    this.sharedTtlMs = options.sharedTtlMs ?? defaults.sharedTtlMs;
    this.tombstoneTtlMs = options.tombstoneTtlMs ?? defaults.tombstoneTtlMs;
    assertTtl('localTtlMs', this.localTtlMs, true);
    assertTtl('sharedTtlMs', this.sharedTtlMs, true);
    assertTtl('tombstoneTtlMs', this.tombstoneTtlMs, false);
    this.clock = toClock(options.clock);
    this.strategy = options.strategy ?? new ConsistentHashStrategy();
    this.currentRegion = options.currentRegion;
    this.onCacheError = options.onCacheError ?? (() => undefined);

    this.maxPlacements = options.maxPlacements ?? defaults.maxPlacements;
    const maxInstances = options.maxInstances ?? defaults.maxInstances;
    this.maxKeyLength = options.maxKeyLength ?? defaults.maxKeyLength;
    assertCapacity('maxPlacements', this.maxPlacements);
    assertCapacity('maxInstances', maxInstances);
    assertCapacity('maxKeyLength', this.maxKeyLength);
    this.tenantIdPattern = options.tenantIdPattern ?? TENANT_ID_UUID_V7;
    if (this.tenantIdPattern.global || this.tenantIdPattern.sticky) {
      throw invalidOption(
        'tenantIdPattern',
        'a RegExp without the g or y flags',
      );
    }

    this.placements = new LruMap(this.maxPlacements);
    this.instances = new LruMap(maxInstances);
    this.tenantInvalidations = new InvalidationLog(this.maxPlacements);
    this.shardInvalidations = new InvalidationLog(maxInstances);
  }

  /**
   * Resolves the physical instance for a request.
   * @throws ShardingError `KeyMissing`, `InvalidTenantId`, `InvalidKey`, `UnknownTenant`, `UnknownShard`,
   *   `TenantMigrating` or `TenantNotWritable`.
   * @throws WrongRegionError when the tenant lives in another region.
   * @throws DeadlineExceededError (`@platform/primitives`) when `request.deadline` passes first.
   * @throws The `reason` of `request.signal` when it aborts first.
   */
  async resolve(request: ResolveRequest): Promise<ResolvedShard> {
    const budget = new LookupBudget(request.deadline, request.signal);
    budget.check();
    const tenantId = this.normalizeTenantId(request.tenantId);
    const routingKey =
      request.keyKind === ShardKey.Tenant
        ? tenantId
        : this.normalizeRoutingKey(request.keyKind, request.keyValue);

    const placement =
      this.cachedPlacement(tenantId) ??
      (await budget.wait(this.loadOrJoin(tenantId)));
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
    const instance =
      readEntry(this.instances, logicalShard, this.now()) ??
      (await budget.wait(this.loadInstance(logicalShard)));

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
   * @throws ShardingError `KeyMissing` or `InvalidTenantId` for a bad tenant id, `InvalidConfiguration`
   *   when `options.version` is not a non-negative integer.
   */
  async invalidate(
    tenantId: string,
    options: InvalidateOptions = {},
  ): Promise<void> {
    const id = this.normalizeTenantId(tenantId);
    const { version } = options;
    if (
      version !== undefined &&
      (!Number.isSafeInteger(version) || version < 0)
    ) {
      throw invalidOption('version', 'a non-negative integer');
    }
    const key = PLACEMENT_CACHE_PREFIX + id;
    this.tenantInvalidations.record(id, this.nextSequence());
    const local = readEntry(this.placements, id, this.now());
    this.placements.delete(id);
    const shared = await this.readSharedRecord(key);
    const group =
      local?.shardGroup ??
      (shared?.kind === 'placement' ? shared.entry.placement.shardGroup : []);
    for (const shard of group) {
      this.invalidateShard(shard);
    }
    await this.writeTombstone(key, tombstoneVersion(local, shared, version));
  }

  /** Clears the cached instance of a logical shard, whatever placements reference it. */
  invalidateShard(logicalShard: string): void {
    this.shardInvalidations.record(logicalShard, this.nextSequence());
    this.instances.delete(logicalShard);
  }

  private normalizeTenantId(tenantId: unknown): string {
    if (typeof tenantId !== 'string' || tenantId.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.KeyMissing,
        'tenantId is required',
      );
    }
    if (
      tenantId.length > MAX_TENANT_ID_LENGTH ||
      !this.tenantIdPattern.test(tenantId)
    ) {
      throw new ShardingError(
        ShardingErrorCode.InvalidTenantId,
        'tenantId does not have the expected format',
        { details: { length: tenantId.length } },
      );
    }
    return tenantId.toLowerCase();
  }

  private normalizeRoutingKey(keyKind: ShardKey, keyValue: unknown): string {
    if (typeof keyValue !== 'string' || keyValue.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.KeyMissing,
        `keyValue is required for key kind "${keyKind}"`,
        { details: { keyKind } },
      );
    }
    if (keyValue.length > this.maxKeyLength) {
      throw new ShardingError(
        ShardingErrorCode.InvalidKey,
        'keyValue is longer than maxKeyLength',
        {
          details: {
            keyKind,
            length: keyValue.length,
            maxLength: this.maxKeyLength,
          },
        },
      );
    }
    const routingKey = keyValue.toLowerCase();
    if (routingKey.length > this.maxKeyLength) {
      throw new ShardingError(
        ShardingErrorCode.InvalidKey,
        'keyValue is longer than maxKeyLength once lowercased',
        { details: { keyKind, maxLength: this.maxKeyLength } },
      );
    }
    return routingKey;
  }

  private cachedPlacement(tenantId: string): TenantPlacement | undefined {
    return readEntry(this.placements, tenantId, this.now());
  }

  /** Joins the load in flight for the tenant, unless an invalidation happened after it started. */
  private loadOrJoin(tenantId: string): Promise<TenantPlacement> {
    const pending = this.inflight.get(tenantId);
    if (
      pending !== undefined &&
      this.tenantInvalidations.lastFor(tenantId) <= pending.startedAt
    ) {
      return pending.promise;
    }
    const startedAt = this.sequence;
    const promise: Promise<TenantPlacement> = this.loadPlacement(
      tenantId,
      startedAt,
    ).finally(() => {
      if (this.inflight.get(tenantId)?.promise === promise) {
        this.inflight.delete(tenantId);
      }
    });
    // Past the limit the load runs without single flight rather than growing the map.
    if (
      this.inflight.has(tenantId) ||
      this.inflight.size < this.maxPlacements
    ) {
      this.inflight.set(tenantId, { startedAt, promise });
    }
    return promise;
  }

  private async loadPlacement(
    tenantId: string,
    sequence: number,
  ): Promise<TenantPlacement> {
    const startedAt = this.now();
    const key = PLACEMENT_CACHE_PREFIX + tenantId;
    const record = await this.readSharedRecord(key);
    const shared = record?.kind === 'placement' ? record.entry : undefined;
    if (shared !== undefined && this.now() < shared.expiresAt) {
      if (this.isCurrent(tenantId, sequence)) {
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
    if (!this.isCurrent(tenantId, sequence)) {
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

  private async loadInstance(logicalShard: string): Promise<string> {
    const startedAt = this.sequence;
    const instance = await this.directory.getInstance(logicalShard);
    if (!instance) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'No instance for logical shard',
        { details: { logicalShard } },
      );
    }
    if (this.shardInvalidations.lastFor(logicalShard) <= startedAt) {
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

  private nextSequence(): number {
    this.sequence += 1;
    return this.sequence;
  }

  /** True when no invalidation of the tenant was recorded after `sequence`. */
  private isCurrent(tenantId: string, sequence: number): boolean {
    return this.tenantInvalidations.lastFor(tenantId) <= sequence;
  }
}
