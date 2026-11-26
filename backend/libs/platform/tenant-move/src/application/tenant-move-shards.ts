import type { TenantMoveRef } from '@contracts/platform';
import type { ShardLocation } from '@platform/persistence';
import {
  ShardAccess,
  ShardKey,
  type DirectoryStore,
  type ShardRouter,
  type TenantPlacement,
} from '@platform/sharding';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';
import type { TenantMoveTarget } from '../targets/tenant-move-target.js';
import type { TenantMoveTargets } from '../targets/tenant-move-targets.js';

/** The source shard of a tenant and its target shard. */
export class TenantMoveShards {
  constructor(
    private readonly router: ShardRouter,
    private readonly directory: DirectoryStore,
    private readonly targets: TenantMoveTargets,
  ) {}

  /**
   * Finds the source shard of a move from the directory.
   * @param move Tenant and move.
   * @returns The source shard.
   * @throws TenantMoveError `NotMovable` if the tenant spreads its data across several shards or already lives on the target.
   * @throws WrongRegionError if the tenant does not live in this process's region.
   */
  async source(move: TenantMoveRef): Promise<ShardLocation> {
    const target = this.targets.of(move);
    const placement = await this.router.placement(move.tenantId);
    const [only, ...rest] = placement.shardGroup;
    if (only === undefined || rest.length > 0 || only === target.shard) {
      throw new TenantMoveError(
        TenantMoveErrorCode.NotMovable,
        'Only a tenant placed in one shard other than the target can move',
        { tenantId: move.tenantId, shardGroup: placement.shardGroup },
      );
    }
    const resolved = await this.router.resolve({
      tenantId: move.tenantId,
      keyKind: ShardKey.Tenant,
      access: ShardAccess.Read,
    });
    return { logicalShard: resolved.logicalShard, instance: resolved.instance };
  }

  /**
   * Finds the target shard of a move.
   * @param move Tenant, group and region.
   * @returns The target shard.
   * @throws TenantMoveError `UnknownTarget` if the group is not configured or its shard is not in the directory.
   */
  async target(move: TenantMoveRef): Promise<ShardLocation> {
    const target = this.targets.of(move);
    const instance = await this.directory.getInstance(target.shard);
    if (instance === undefined) {
      throw new TenantMoveError(
        TenantMoveErrorCode.UnknownTarget,
        'The target shard is not in the directory',
        { shard: target.shard },
      );
    }
    return { logicalShard: target.shard, instance };
  }

  /**
   * The tenant placement as the service directory stores it, bypassing the router cache.
   * @param tenantId Tenant to read.
   * @returns The placement, or `undefined`.
   */
  placementOf(tenantId: string): Promise<TenantPlacement | undefined> {
    return this.directory.getPlacement(tenantId);
  }

  /**
   * Reads the configured target of a move.
   * @param move Tenant, group and region.
   * @returns The target.
   * @throws TenantMoveError `UnknownTarget` if the group is not configured for the requested region.
   */
  targetOf(move: TenantMoveRef): TenantMoveTarget {
    return this.targets.of(move);
  }
}
