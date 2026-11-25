import { ShardingError, ShardingErrorCode } from '@platform/sharding';
import type { EntityManager } from 'typeorm';
import { SessionSetting } from './enums.js';
import type { AcrossShardsResult } from './model/across-shards-result.js';
import { TenantWriteFence } from './tenant-write-fence.js';

/**
 * Maintenance transaction over a whole shard: marks the session so that the maintenance policy
 * of the tenant tables (`TenantIsolationSql.allowMaintenance`) lets it see and change the rows of all
 * tenants. The mark lives only inside that transaction.
 *
 * It also enters through the relocation barrier (`TenantWriteFence.enterMaintenance`): fails with `TENANT_MIGRATING` if a
 * relocation is halfway through on the shard, and the relocation waits for the one that already entered to finish. The
 * maintenance queries leave out the rows of tenants that already left with `TenantWriteFence.unfenced`.
 */
export class TenantMaintenanceSession {
  private static readonly fence = new TenantWriteFence();

  static async run<T>(
    manager: EntityManager,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return manager.transaction(async (transaction) => {
      await transaction.query('SELECT set_config($1, $2, true)', [
        SessionSetting.Maintenance,
        'on',
      ]);
      await TenantMaintenanceSession.fence.enterMaintenance(transaction);
      return fn(transaction);
    });
  }

  /**
   * For maintenance tasks that nobody repeats on their own, such as deleting a user's data: if a shard did not run
   * because it had a relocation halfway through, fails so the caller repeats it.
   * @throws ShardingError `TenantMigrating` if some shard did not run because of a relocation.
   */
  static requireEveryShard<T>(outcome: AcrossShardsResult<T>): void {
    const migrating = outcome.failures.find(
      (failure) => failure.code === ShardingErrorCode.TenantMigrating,
    );
    if (migrating !== undefined) {
      throw new ShardingError(
        ShardingErrorCode.TenantMigrating,
        'A shard is in the middle of a tenant move; repeat the maintenance later',
        { details: { shard: migrating.shard } },
      );
    }
  }
}
