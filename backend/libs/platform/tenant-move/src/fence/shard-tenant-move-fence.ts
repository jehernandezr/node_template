import type { ShardLocation, TenantWriteFence } from '@platform/persistence';
import { TenantMoveFence } from '../application/tenant-move-fence.js';
import type { ShardConnections } from '../transfer/typeorm/shard-connections.js';

/** `TenantMoveFence` over the persistence write fence of each shard. */
export class ShardTenantMoveFence extends TenantMoveFence {
  constructor(
    private readonly fence: TenantWriteFence,
    private readonly connections: ShardConnections,
  ) {
    super();
  }

  /** Raises the fence of the move on the shard. */
  override async raise(
    shard: ShardLocation,
    tenantId: string,
    moveId: string,
  ): Promise<void> {
    await this.fence.raise(await this.connections.get(shard), tenantId, moveId);
  }

  /** Marks the fence of the move as pivoted on the shard. */
  override async markSwitched(
    shard: ShardLocation,
    tenantId: string,
    moveId: string,
  ): Promise<void> {
    await this.fence.markSwitched(
      await this.connections.get(shard),
      tenantId,
      moveId,
    );
  }

  /** The move whose fence is raised on the shard, or `undefined`. */
  override async raisedBy(
    shard: ShardLocation,
    tenantId: string,
  ): Promise<string | undefined> {
    return this.fence.raisedBy(await this.connections.get(shard), tenantId);
  }

  /** The move whose fence is raised on the shard without pivoting, or `undefined`. */
  override async unswitchedBy(
    shard: ShardLocation,
    tenantId: string,
  ): Promise<string | undefined> {
    return this.fence.unswitchedBy(await this.connections.get(shard), tenantId);
  }

  /** Lowers the fence of the move on the shard. */
  override async lower(
    shard: ShardLocation,
    tenantId: string,
    moveId: string,
  ): Promise<void> {
    await this.fence.lower(await this.connections.get(shard), tenantId, moveId);
  }

  /** Lowers any fence of the tenant on the shard. */
  override async lowerAny(
    shard: ShardLocation,
    tenantId: string,
  ): Promise<void> {
    await this.fence.lowerAny(await this.connections.get(shard), tenantId);
  }
}
