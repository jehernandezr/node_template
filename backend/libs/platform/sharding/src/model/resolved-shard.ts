import type { TenantStatus } from './tenant-status.enum.js';

/** Result of routing a request to a physical instance. */
export interface ResolvedShard {
  readonly tenantId: string;
  readonly region: string;
  readonly logicalShard: string;
  /** Physical instance that hosts the logical shard. */
  readonly instance: string;
  readonly status: TenantStatus;
}
