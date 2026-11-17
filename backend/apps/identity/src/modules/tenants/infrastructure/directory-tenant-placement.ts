import { Injectable } from '@nestjs/common';
import { TypeOrmDirectoryStore } from '@platform/adapters-postgres';
import {
  LeastLoadedPlacementPolicy,
  ShardingError,
  ShardingErrorCode,
  TenantPlacer,
  TenantStatus,
} from '@platform/sharding';
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
  ): Promise<void> {
    if (spread) {
      await this.placeEverywhere(tenantId, region);
      return;
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
  }

  private async placeEverywhere(
    tenantId: string,
    region: string,
  ): Promise<void> {
    if ((await this.directory.getPlacement(tenantId)) !== undefined) {
      return;
    }
    const shards = await this.directory.listShards();
    await this.directory.putPlacement(
      {
        tenantId,
        region,
        shardGroup: [...shards].sort(),
        status: TenantStatus.Active,
        version: 1,
        dedicated: false,
      },
      undefined,
    );
  }
}
