import { ShardingError, ShardingErrorCode } from './errors.js';
import { TenantStatus, type TenantPlacement } from './types.js';

/** Request to place a new tenant. */
export interface PlacementRequest {
  readonly tenantId: string;
  readonly region: string;
  /** When true, the tenant gets a shard that no other tenant uses, and no one else may use it later. */
  readonly dedicated: boolean;
}

/** A logical shard that can receive tenants, with its region. */
export interface AvailableShard {
  readonly region: string;
  readonly shard: string;
}

/** Decides where a new tenant is placed. */
export interface PlacementPolicy {
  place(
    request: PlacementRequest,
    current: readonly TenantPlacement[],
    availableShards: readonly AvailableShard[],
  ): TenantPlacement;
}

/**
 * Places tenants on the shard of the region with the fewest tenants (load = tenants per shard).
 *
 * - Idempotent: a tenant already in `current` gets its existing placement back, so retries are safe.
 * - Dedicated tenants only take shards with no tenants at all.
 * - Shards used by a dedicated tenant are excluded for everyone else.
 * - Ties go to the shard listed first.
 *
 * @throws ShardingError `UnknownShard` when no suitable shard exists in the region.
 */
export class LeastLoadedPlacementPolicy implements PlacementPolicy {
  place(
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
        `No shards available in region "${request.region}"`,
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
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        `No ${kind} in region "${request.region}" for "${request.tenantId}"`,
      );
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
