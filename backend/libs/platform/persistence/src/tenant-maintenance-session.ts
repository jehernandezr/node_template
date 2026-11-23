import type { EntityManager } from 'typeorm';
import { SessionSetting } from './enums.js';

/**
 * Transacción de mantenimiento sobre un shard entero: marca la sesión para que la política de mantenimiento
 * de las tablas de tenant (`TenantIsolationSql.allowMaintenance`) deje ver y cambiar las filas de todos los
 * tenants. La marca vive solo dentro de esa transacción.
 */
export class TenantMaintenanceSession {
  static async run<T>(
    manager: EntityManager,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return manager.transaction(async (transaction) => {
      await transaction.query('SELECT set_config($1, $2, true)', [
        SessionSetting.Maintenance,
        'on',
      ]);
      return fn(transaction);
    });
  }
}
