import { Injectable } from '@nestjs/common';
import { TypeOrmDirectoryStore } from '@platform/adapters-postgres';
import {
  DirectoryWriteResult,
  LeastLoadedPlacementPolicy,
  ShardingError,
  ShardingErrorCode,
  TenantPlacer,
  TenantStatus,
  type TenantPlacement as DirectoryPlacement,
} from '@platform/sharding';
import type { PlacedTenant } from '../domain/placed-tenant.js';
import { TenantPlacement } from '../domain/tenant-placement.js';

/**
 * Ubica tenants con `TenantPlacer` y `LeastLoadedPlacementPolicy` sobre el directorio de shards del catálogo.
 * Este despliegue tiene una región, así que todos los shards del directorio son de la región pedida.
 */
@Injectable()
export class DirectoryTenantPlacement extends TenantPlacement {
  private readonly placer: TenantPlacer;

  constructor(private readonly directory: TypeOrmDirectoryStore) {
    super();
    this.placer = new TenantPlacer(new LeastLoadedPlacementPolicy(), directory);
  }

  async place(
    tenantId: string,
    region: string,
    spread: boolean,
  ): Promise<PlacedTenant> {
    if (spread) {
      return this.placeEverywhere(tenantId, region);
    }
    const shards = await this.directory.listShards();
    const result = await this.placer.place(
      { tenantId, region, dedicated: false },
      shards.map((shard) => ({ region, shard })),
    );
    if (!result.placed) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'The tenant could not be placed',
        { details: { tenantId, conflict: result.conflict } },
      );
    }
    return DirectoryTenantPlacement.placed(result.placement);
  }

  private async placeEverywhere(
    tenantId: string,
    region: string,
  ): Promise<PlacedTenant> {
    const existing = await this.directory.readPlacement(tenantId);
    if (existing !== undefined) {
      return DirectoryTenantPlacement.placed(existing);
    }
    const placement: DirectoryPlacement = {
      tenantId,
      region,
      shardGroup: [...(await this.directory.listShards())].sort(),
      status: TenantStatus.Active,
      version: 1,
      dedicated: false,
    };
    const result = await this.directory.putPlacement(placement, undefined);
    if (result === DirectoryWriteResult.Written) {
      return DirectoryTenantPlacement.placed(placement);
    }
    const winner = await this.directory.readPlacement(tenantId);
    if (winner === undefined) {
      throw new ShardingError(
        ShardingErrorCode.UnknownShard,
        'The tenant could not be placed',
        { details: { tenantId, conflict: result } },
      );
    }
    return DirectoryTenantPlacement.placed(winner);
  }

  private static placed(placement: DirectoryPlacement): PlacedTenant {
    return {
      region: placement.region,
      shards: placement.shardGroup,
      dedicated: placement.dedicated,
    };
  }
}
