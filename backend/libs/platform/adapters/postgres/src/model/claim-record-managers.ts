import type { ManagerIntent } from '@platform/persistence';
import type { EntityManager } from 'typeorm';

/**
 * Where a claims table runs: `PlatformEntityManagers` takes it to the tenant's shard and
 * `CatalogClaimManagers` to the global catalog.
 */
export interface ClaimRecordManagers {
  run<T>(
    intent: ManagerIntent,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T>;
  /** Maintenance that does not belong to a tenant: returns the sum of what `fn` returns. */
  sweep(fn: (manager: EntityManager) => Promise<number>): Promise<number>;
}
