import { ShardingError, ShardingErrorCode } from '@platform/sharding';
import type { EntityManager } from 'typeorm';
import { SessionSetting } from './enums.js';
import type { AcrossShardsResult } from './model/across-shards-result.js';
import { TenantWriteFence } from './tenant-write-fence.js';

/**
 * Transacción de mantenimiento sobre un shard entero: marca la sesión para que la política de mantenimiento
 * de las tablas de tenant (`TenantIsolationSql.allowMaintenance`) deje ver y cambiar las filas de todos los
 * tenants. La marca vive solo dentro de esa transacción.
 *
 * Entra además por la barrera de traslado (`TenantWriteFence.enterMaintenance`): falla con `TENANT_MIGRATING` si un
 * traslado está a medio camino en el shard, y el traslado espera a que termine la que ya entró. Las consultas del
 * mantenimiento dejan fuera las filas de los tenants que ya se fueron con `TenantWriteFence.unfenced`.
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
   * Para los mantenimientos que nadie repite solo, como el borrado de los datos de un usuario: si un shard no corrió
   * porque tenía un traslado a medio camino, falla para que quien llama lo repita.
   * @throws ShardingError `TenantMigrating` si algún shard no corrió por un traslado.
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
