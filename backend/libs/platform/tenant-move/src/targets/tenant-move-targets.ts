import type { TenantMoveRef } from '@contracts/platform';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';
import type { TenantMoveTarget } from './tenant-move-target.js';

/** The target groups this service knows, from `TENANT_MOVE_TARGETS`. */
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

  /** The target of a group, or `undefined` if it is not configured. */
  find(group: string): TenantMoveTarget | undefined {
    return this.byGroup.get(group);
  }

  /** The region group that leads to this service's logical shard, or `undefined` if none names it. */
  groupOf(region: string, shard: string): string | undefined {
    for (const target of this.byGroup.values()) {
      if (target.region === region && target.shard === shard) {
        return target.group;
      }
    }
    return undefined;
  }

  /**
   * @throws TenantMoveError `UnknownTarget` if the group does not exist or its region is not the requested one.
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
