import type { TenantMoveRef } from '@contracts/platform';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';
import type { TenantMoveTarget } from './tenant-move-target.js';

/** Los grupos de destino que este servicio conoce, de `TENANT_MOVE_TARGETS`. */
export class TenantMoveTargets {
  private readonly byGroup: ReadonlyMap<string, TenantMoveTarget>;

  constructor(
    targets: Readonly<Record<string, { region: string; shard: string }>>,
  ) {
    this.byGroup = new Map(
      Object.entries(targets).map(([group, target]) => [
        group,
        { group, region: target.region, shard: target.shard },
      ]),
    );
  }

  /** El destino de un grupo, o `undefined` si no está configurado. */
  find(group: string): TenantMoveTarget | undefined {
    return this.byGroup.get(group);
  }

  /** El grupo de la región que lleva al shard lógico de este servicio, o `undefined` si ninguno lo nombra. */
  groupOf(region: string, shard: string): string | undefined {
    for (const target of this.byGroup.values()) {
      if (target.region === region && target.shard === shard) {
        return target.group;
      }
    }
    return undefined;
  }

  /**
   * @throws TenantMoveError `UnknownTarget` si el grupo no existe o su región no es la pedida.
   */
  of(move: TenantMoveRef): TenantMoveTarget {
    const target = this.find(move.targetGroup);
    if (target === undefined || target.region !== move.targetRegion) {
      throw new TenantMoveError(
        TenantMoveErrorCode.UnknownTarget,
        'The target group is not configured for this region',
        { targetGroup: move.targetGroup, targetRegion: move.targetRegion },
      );
    }
    return target;
  }
}
