import type { ShardLocation } from '@platform/persistence';

/**
 * The move fence of a tenant on a shard: while it is raised, the tenant's writes on that shard wait for it, and the move
 * that raised it is the only one that may pivot or lower it.
 */
export abstract class TenantMoveFence {
  /** Raises the fence of the move, waiting for the tenant writes already in progress on the shard. */
  abstract raise(
    shard: ShardLocation,
    tenantId: string,
    moveId: string,
  ): Promise<void>;

  /** Marks the fence of the move as pivoted: the tenant now lives on another shard. */
  abstract markSwitched(
    shard: ShardLocation,
    tenantId: string,
    moveId: string,
  ): Promise<void>;

  /** The move whose fence is raised on the shard, or `undefined`. */
  abstract raisedBy(
    shard: ShardLocation,
    tenantId: string,
  ): Promise<string | undefined>;

  /** The move whose fence is raised on the shard and has not pivoted yet, or `undefined`. */
  abstract unswitchedBy(
    shard: ShardLocation,
    tenantId: string,
  ): Promise<string | undefined>;

  /** Lowers the fence if it belongs to the move. */
  abstract lower(
    shard: ShardLocation,
    tenantId: string,
    moveId: string,
  ): Promise<void>;

  /** Lowers whatever fence the tenant has on the shard. */
  abstract lowerAny(shard: ShardLocation, tenantId: string): Promise<void>;
}
