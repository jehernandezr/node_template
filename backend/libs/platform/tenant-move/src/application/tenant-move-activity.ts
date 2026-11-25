import type { DataSource } from 'typeorm';

/** Tenant work on a shard that can still write there and that the move cannot carry half-finished. */
export abstract class TenantMoveActivity {
  /** How many tenant jobs are still open on the shard. */
  abstract openWork(shard: DataSource, tenantId: string): Promise<number>;
}
