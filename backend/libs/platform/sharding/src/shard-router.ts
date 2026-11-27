import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';
import { WrongRegionError } from './errors/wrong-region.error.js';
import { ShardAccess } from './model/shard-access.enum.js';
import { ShardKey } from './model/shard-key.enum.js';
import type { ResolvedShard } from './model/resolved-shard.js';
import type { ShardDirectoryChanged } from './model/shard-directory-changed.js';
import type { TenantPlacement } from './model/tenant-placement.js';
import type { ShardDirectoryChangeSubscriber } from './ports/shard-directory-change-subscriber.js';
import type { InvalidateOptions } from './router/invalidate-options.js';
import { LookupBudget } from './router/lookup-budget.js';
import type { ResolveRequest } from './router/resolve-request.js';
import { ShardRouterAssembler } from './router/shard-router-assembler.js';
import type { ShardRouterOptions } from './router/shard-router-options.js';
import type { ShardRouterParts } from './router/shard-router-parts.js';
import { PlacementWriteRule } from './router/placement-write-rule.js';

/**
 * Routes a request to its physical instance: tenant, region, shard group,
 * logical shard and instance.
 *
 * Tenant ids and routing keys are lowercased before
 * use; the directory must store lowercase ids. A key longer than
 * `maxKeyLength` is rejected.
 *
 * A placement is looked up in the in-process map, then in the shared cache and
 * finally in the directory. Simultaneous misses for the same tenant share
 * a single load. An invalidation after a load starts makes its
 * result reach the requester without being cached. Across processes, `invalidate`
 * leaves a versioned tombstone in the shared cache and publishes the change.
 *
 * Adding a shard to a group is only valid with a move saga and the
 * tenant in `Migrating`: the new placement version gets a new ring and
 * writes stay blocked until the move finishes.
 */
export class ShardRouter {
  private readonly parts: ShardRouterParts;

  /** @throws ShardingError `InvalidConfiguration` when a TTL, a limit or the pattern is invalid. */
  constructor(options: ShardRouterOptions) {
    this.parts = ShardRouterAssembler.assemble(options);
  }

  /**
   * Resolves the physical instance of a request.
   * @param request Key and intent.
   * @returns The resolved shard.
   * @throws ShardingError `KeyMissing`, `InvalidTenantId`, `InvalidKey`, `UnknownTenant`,
   *   `UnknownShard`, `TenantMigrating` or `TenantNotWritable`.
   * @throws WrongRegionError when the tenant lives in another region.
   * @throws DeadlineExceededError (`@platform/primitives`) if `request.deadline` expires first.
   * @throws The `reason` of `request.signal` if it aborts first.
   */
  async resolve(request: ResolveRequest): Promise<ResolvedShard> {
    const { clock, normalizer, cache, loader, instances } = this.parts;
    const budget = new LookupBudget(clock, request.deadline, request.signal);
    budget.check();
    const tenantId = normalizer.tenantId(request.tenantId);
    const routingKey =
      request.keyKind === ShardKey.Tenant
        ? tenantId
        : normalizer.routingKey(request.keyKind, request.keyValue);

    const placement =
      cache.local(tenantId) ?? (await budget.wait(loader.loadOrJoin(tenantId)));
    if (
      this.parts.currentRegion !== undefined &&
      placement.region !== this.parts.currentRegion
    ) {
      throw new WrongRegionError(
        placement.region,
        this.parts.regionUrls.get(placement.region),
      );
    }
    if (request.access === ShardAccess.Write) {
      PlacementWriteRule.assertWritable(tenantId, placement.status);
    }
    const logicalShard = this.selectLogicalShard(placement, routingKey);
    const instance =
      instances.cached(logicalShard) ??
      (await budget.wait(instances.load(logicalShard)));
    return {
      tenantId,
      region: placement.region,
      logicalShard,
      instance,
      status: placement.status,
    };
  }

  /**
   * Tenant placement, from the in-process cache or loaded, without checking region or status.
   * @param tenantId Tenant to read.
   * @returns The placement.
   * @throws ShardingError `KeyMissing`, `InvalidTenantId` or `UnknownTenant`.
   */
  async placement(tenantId: string): Promise<TenantPlacement> {
    const { normalizer, cache, loader } = this.parts;
    const normalized = normalizer.tenantId(tenantId);
    return cache.local(normalized) ?? loader.loadOrJoin(normalized);
  }

  /**
   * Throws the same errors as a write `resolve`, for a result already in hand.
   * @param resolved Resolved shard.
   */
  assertWritable(resolved: ResolvedShard): void {
    PlacementWriteRule.assertWritable(resolved.tenantId, resolved.status);
  }

  /**
   * Discards a tenant placement and the instances of its shard group, leaves a versioned
   * tombstone in the shared cache and publishes the change to the other processes. Called
   * after the directory write is committed.
   * @param tenantId Tenant to invalidate.
   * @param options Version and whether to publish.
   * @throws ShardingError `KeyMissing` or `InvalidTenantId` for a bad id, `InvalidConfiguration`
   *   when `options.version` is not a non-negative integer.
   */
  invalidate(tenantId: string, options: InvalidateOptions = {}): Promise<void> {
    return this.parts.invalidator.invalidate(tenantId, options);
  }

  /**
   * Applies a change published by another process. Only changes in-process state. Never throws
   * on a bad event: reports it to `onCacheError` and ignores it.
   * @param event Directory change.
   */
  applyDirectoryChange(event: ShardDirectoryChanged): void {
    this.parts.applier.apply(event);
  }

  /**
   * Subscribes this router to directory changes from every process.
   * @returns a function that stops listening.
   * @param subscriber Source of the changes.
   */
  listen(
    subscriber: ShardDirectoryChangeSubscriber,
  ): Promise<() => Promise<void>> {
    return subscriber.subscribe((event) => this.applyDirectoryChange(event));
  }

  /**
   * Stops caching placements and instances while directory changes cannot reach this process: every lookup reads
   * the directory until `resumeCaching`.
   */
  suspendCaching(): void {
    this.parts.cache.suspend();
    this.parts.instances.suspend();
  }

  /**
   * Caches again once directory changes reach this process, flushed: what the process cached is forgotten and the
   * shared placements written before now are ignored.
   */
  resumeCaching(): void {
    this.parts.cache.resume();
    this.parts.instances.resume();
  }

  /**
   * Deletes the cached instance of a logical shard, regardless of which placements reference it.
   * @param logicalShard Logical shard.
   */
  invalidateShard(logicalShard: string): void {
    this.parts.instances.invalidate(logicalShard);
  }

  private selectLogicalShard(
    placement: TenantPlacement,
    routingKey: string,
  ): string {
    const [first] = placement.shardGroup;
    if (first === undefined) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'Tenant has no shards assigned',
        { details: { tenantId: placement.tenantId } },
      );
    }
    if (placement.shardGroup.length === 1) {
      return first;
    }
    return this.parts.strategy.locate(
      routingKey,
      placement.shardGroup,
      placement.version,
    );
  }
}
