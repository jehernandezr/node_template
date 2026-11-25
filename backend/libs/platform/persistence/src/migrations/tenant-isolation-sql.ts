import { SessionSetting } from '../enums.js';

/**
 * RLS of tenant tables: with `app.tenant_id` only the rows of that tenant are visible and writable. It is the
 * second barrier after each repository's `tenant_id` filter. `FORCE` also applies it to the
 * table owner, which is the service user. Fails closed: without a tenant in the session no row is
 * visible or writable. That is why `TenantIsolatedRepository` sets the tenant on every query, reads
 * included. A maintenance task that walks all tenants of a shard (purges, deletion of a
 * user's data) opens its transaction with `app.maintenance = on` (`TenantMaintenanceSession`) and goes through the
 * maintenance policy, which only exists on the tables that request it.
 */
export class TenantIsolationSql {
  private static readonly IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

  static enable(table: string): string[] {
    const name = TenantIsolationSql.identifier(table);
    // `nullif` turns the empty value (no tenant) into NULL, and a comparison with NULL is never true.
    const condition = `"tenant_id"::text = nullif(current_setting('${SessionSetting.TenantId}', true), '')`;
    return [
      `ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE "${name}" FORCE ROW LEVEL SECURITY`,
      `CREATE POLICY "${name}_tenant_isolation" ON "${name}" USING (${condition}) WITH CHECK (${condition})`,
    ];
  }

  /** Lets through the transaction of a cross-tenant maintenance task. */
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
