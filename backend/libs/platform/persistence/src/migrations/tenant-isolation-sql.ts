import { SessionSetting } from '../enums.js';

/**
 * RLS de las tablas de tenant: con `app.tenant_id` solo se ven y se escriben las filas de ese tenant. Es la
 * segunda barrera después del filtro por `tenant_id` de cada repositorio. `FORCE` la aplica también al
 * dueño de la tabla, que es el usuario del servicio. Falla cerrada: sin tenant en la sesión no se ve ni se
 * escribe ninguna fila. Por eso `TenantIsolatedRepository` fija el tenant en cada consulta, también en las
 * lecturas. Un mantenimiento que recorre todos los tenants de un shard (purgas, borrado de datos de un
 * usuario) abre su transacción con `app.maintenance = on` (`TenantMaintenanceSession`) y pasa por la política
 * de mantenimiento, que solo existe en las tablas que la piden.
 */
export class TenantIsolationSql {
  private static readonly IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

  static enable(table: string): string[] {
    const name = TenantIsolationSql.identifier(table);
    // `nullif` convierte el valor vacío (sin tenant) en NULL, y la comparación con NULL nunca es verdadera.
    const condition = `"tenant_id"::text = nullif(current_setting('${SessionSetting.TenantId}', true), '')`;
    return [
      `ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE "${name}" FORCE ROW LEVEL SECURITY`,
      `CREATE POLICY "${name}_tenant_isolation" ON "${name}" USING (${condition}) WITH CHECK (${condition})`,
    ];
  }

  /** Deja pasar la transacción de un mantenimiento entre tenants. */
  static allowMaintenance(table: string): string[] {
    const name = TenantIsolationSql.identifier(table);
    const condition = `current_setting('${SessionSetting.Maintenance}', true) = 'on'`;
    return [
      `CREATE POLICY "${name}_maintenance" ON "${name}" USING (${condition}) WITH CHECK (${condition})`,
    ];
  }

  static disallowMaintenance(table: string): string[] {
    const name = TenantIsolationSql.identifier(table);
    return [`DROP POLICY IF EXISTS "${name}_maintenance" ON "${name}"`];
  }

  static disable(table: string): string[] {
    const name = TenantIsolationSql.identifier(table);
    return [
      `DROP POLICY IF EXISTS "${name}_tenant_isolation" ON "${name}"`,
      `ALTER TABLE "${name}" NO FORCE ROW LEVEL SECURITY`,
      `ALTER TABLE "${name}" DISABLE ROW LEVEL SECURITY`,
    ];
  }

  private static identifier(table: string): string {
    if (!TenantIsolationSql.IDENTIFIER.test(table)) {
      throw new Error(`Not a plain table name: ${table}`);
    }
    return table;
  }
}
