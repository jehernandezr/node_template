import type { ShardLocation } from '@platform/persistence';

/** Tenant work on a shard that can still write there and that the move cannot carry half-finished. */
export abstract class TenantMoveActivity {
  /**
   * How many tenant jobs are still open on the shard.
   * @param shard Shard to check.
   * @param tenantId Moving tenant.
   * @returns The open jobs.
   */
  abstract openWork(shard: ShardLocation, tenantId: string): Promise<number>;
}
