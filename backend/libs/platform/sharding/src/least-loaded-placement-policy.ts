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
 * Ubica tenants en el shard de la región con menos tenants (carga = tenants por shard).
 *
 * - Idempotente: un tenant que ya está en `current` recibe su placement existente, así los reintentos son seguros.
 * - Los tenants dedicados solo toman shards sin ningún tenant.
 * - Los shards que usa un tenant dedicado quedan excluidos para los demás.
 * - Los empates van al shard que aparece primero en la lista.
 *
 * @throws ShardingError `UnknownShard` cuando no hay un shard adecuado en la región.
 */
export class LeastLoadedPlacementPolicy extends ShardPlacementPolicy {
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
