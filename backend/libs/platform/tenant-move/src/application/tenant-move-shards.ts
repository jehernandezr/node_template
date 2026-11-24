import type { TenantMoveRef } from '@contracts/platform';
import type { ShardDataSources } from '@platform/persistence';
import {
  ShardAccess,
  ShardKey,
  type DirectoryStore,
  type ShardRouter,
  type TenantPlacement,
} from '@platform/sharding';
import type { DataSource } from 'typeorm';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';
import type { TenantMoveTarget } from '../targets/tenant-move-target.js';
import type { TenantMoveTargets } from '../targets/tenant-move-targets.js';

/** El shard de origen de un tenant y el de su destino, con sus `DataSource`. */
export class TenantMoveShards {
  constructor(
    private readonly router: ShardRouter,
    private readonly directory: DirectoryStore,
    private readonly sources: ShardDataSources,
    private readonly targets: TenantMoveTargets,
  ) {}

  /**
   * @throws TenantMoveError `NotMovable` si el tenant reparte sus datos en varios shards o ya vive en el destino.
   * @throws WrongRegionError si el tenant no vive en la región de este proceso.
   */
  async source(move: TenantMoveRef): Promise<DataSource> {
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
    return this.sources.get(resolved);
  }

  /** @throws TenantMoveError `UnknownTarget` si el grupo no está configurado o su shard no está en el directorio. */
  async target(move: TenantMoveRef): Promise<DataSource> {
    const target = this.targets.of(move);
    const instance = await this.directory.getInstance(target.shard);
    if (instance === undefined) {
      throw new TenantMoveError(
        TenantMoveErrorCode.UnknownTarget,
        'The target shard is not in the directory',
        { shard: target.shard },
      );
    }
    return this.sources.get({ logicalShard: target.shard, instance });
  }

  /** El placement del tenant tal como lo guarda el directorio del servicio, sin pasar por el caché del router. */
  placementOf(tenantId: string): Promise<TenantPlacement | undefined> {
    return this.directory.getPlacement(tenantId);
  }

  /** @throws TenantMoveError `UnknownTarget` si el grupo no está configurado para la región pedida. */
  targetOf(move: TenantMoveRef): TenantMoveTarget {
    return this.targets.of(move);
  }
}
