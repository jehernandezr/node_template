import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';
import type { TenantMoveTargets } from '../targets/tenant-move-targets.js';

/**
 * Traduce entre los shards lógicos de este servicio y los grupos de shards que todos los servicios comparten. Un grupo
 * declarado en `TENANT_MOVE_TARGETS` manda; sin él, el grupo de un shard es su nombre sin el prefijo del servicio, así
 * `identity_shard_1` y `tasks_shard_1` caen en el grupo `shard_1` sin configurar nada en un despliegue de una región.
 * El prefijo usa guiones bajos, como las bases: el servicio `stock-items` tiene `stock_items_shard_0`.
 */
export class TenantShardGroups {
  private readonly prefix: string;

  constructor(
    service: string,
    private readonly targets: TenantMoveTargets,
  ) {
    this.prefix = `${service.replaceAll('-', '_')}_`;
  }

  /** Los grupos de los shards de un placement de este servicio, en el mismo orden. */
  groupsOf(region: string, shards: readonly string[]): string[] {
    return shards.map(
      (shard) => this.targets.groupOf(region, shard) ?? this.unprefixed(shard),
    );
  }

  /**
   * El shard lógico de este servicio en un grupo.
   * @throws TenantMoveError `UnknownTarget` si el grupo está declarado para otra región.
   */
  shardOf(region: string, group: string): string {
    const target = this.targets.find(group);
    if (target === undefined) {
      return `${this.prefix}${group}`;
    }
    if (target.region !== region) {
      throw new TenantMoveError(
        TenantMoveErrorCode.UnknownTarget,
        'The shard group belongs to another region',
        { group, region },
      );
    }
    return target.shard;
  }

  private unprefixed(shard: string): string {
    return shard.startsWith(this.prefix)
      ? shard.slice(this.prefix.length)
      : shard;
  }
}
