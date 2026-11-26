import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../errors/tenant-move.error.js';
import type { TenantMoveTargets } from '../targets/tenant-move-targets.js';

/**
 * Translates between this service's logical shards and the shard groups all services share. A group
 * declared in `TENANT_MOVE_TARGETS` wins; without it, a shard's group is its name without the service prefix, so
 * `identity_shard_1` and `tasks_shard_1` fall in group `shard_1` with nothing configured in a single-region deployment.
 * The prefix uses underscores, like the databases: the `stock-items` service has `stock_items_shard_0`.
 */
export class TenantShardGroups {
  private readonly prefix: string;

  constructor(
    service: string,
    private readonly targets: TenantMoveTargets,
  ) {
    this.prefix = `${service.replaceAll('-', '_')}_`;
  }

  /**
   * The groups of the shards of a placement of this service, in the same order.
   * @param region Region of the placement.
   * @param shards Logical shards.
   * @returns The groups.
   */
  groupsOf(region: string, shards: readonly string[]): string[] {
    return shards.map(
      (shard) => this.targets.groupOf(region, shard) ?? this.unprefixed(shard),
    );
  }

  /**
   * The logical shard of this service in a group.
   * @param region Region of the group.
   * @param group Group name.
   * @returns The logical shard.
   * @throws TenantMoveError `UnknownTarget` if the group is declared for another region.
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
