import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';
import type { TenantPlacement } from './model/tenant-placement.js';
import { TenantStatus } from './model/tenant-status.enum.js';
import {
  ShardPlacementPolicy,
  type AvailableShard,
  type PlacementRequest,
} from './placement-policy.js';

/**
 * Places tenants on the region shard with the fewest tenants (load = tenants per shard).
 *
 * - Idempotent: a tenant already in `current` gets its existing placement, so retries are safe.
 * - Dedicated tenants only take shards with no tenants at all.
 * - Shards used by a dedicated tenant are excluded for everyone else.
 * - Ties go to the shard that appears first in the list.
 *
 * @throws ShardingError `UnknownShard` when there is no suitable shard in the region.
 */
export class LeastLoadedPlacementPolicy extends ShardPlacementPolicy {
  override place(
    request: PlacementRequest,
    current: readonly TenantPlacement[],
    availableShards: readonly AvailableShard[],
  ): TenantPlacement {
    const existing = current.find(
      (placement) => placement.tenantId === request.tenantId,
    );
    if (existing !== undefined) {
      return existing;
    }

    const regionShards = availableShards.filter(
      (candidate) => candidate.region === request.region,
    );
    if (regionShards.length === 0) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'No shards available in region',
        { details: { region: request.region } },
      );
    }

    const load = new Map<string, number>();
    const dedicatedShards = new Set<string>();
    for (const placement of current) {
      if (placement.region !== request.region) {
        continue;
      }
      for (const shard of placement.shardGroup) {
        load.set(shard, (load.get(shard) ?? 0) + 1);
        if (placement.dedicated) {
          dedicatedShards.add(shard);
        }
      }
    }

    let chosen: { shard: string; tenants: number } | undefined;
    for (const candidate of regionShards) {
      const tenants = load.get(candidate.shard) ?? 0;
      const excluded = request.dedicated
        ? tenants > 0
        : dedicatedShards.has(candidate.shard);
      if (excluded) {
        continue;
      }
      if (chosen === undefined || tenants < chosen.tenants) {
        chosen = { shard: candidate.shard, tenants };
      }
    }

    if (chosen === undefined) {
      const kind = request.dedicated
        ? 'free shard for a dedicated tenant'
        : 'shard for a tenant';
      throw new ShardingError(ShardingErrorCode.UnknownShard, `No ${kind}`, {
        details: { region: request.region, tenantId: request.tenantId },
      });
    }

    return {
      tenantId: request.tenantId,
      region: request.region,
      shardGroup: [chosen.shard],
      status: TenantStatus.Active,
      version: 1,
      dedicated: request.dedicated,
    };
  }
}
