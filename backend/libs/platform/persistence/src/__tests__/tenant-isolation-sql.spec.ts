import { TenantIsolationSql } from '../migrations/tenant-isolation-sql.js';

describe('TenantIsolationSql', () => {
  it('forces a policy that compares tenant_id with the session tenant', () => {
    const statements = TenantIsolationSql.enable('tasks');

    expect(statements).toEqual([
      'ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY',
      expect.stringContaining(
        `CREATE POLICY "tasks_tenant_isolation" ON "tasks" USING ("tenant_id"::text = nullif(current_setting('app.tenant_id', true), ''))`,
      ),
    ]);
  });

  it('drops the policy and the row level security in reverse order', () => {
    expect(TenantIsolationSql.disable('tasks')).toEqual([
      'DROP POLICY IF EXISTS "tasks_tenant_isolation" ON "tasks"',
      'ALTER TABLE "tasks" NO FORCE ROW LEVEL SECURITY',
      'ALTER TABLE "tasks" DISABLE ROW LEVEL SECURITY',
    ]);
  });

  it('rejects a name that is not a plain table identifier', () => {
    expect(() => TenantIsolationSql.enable('tasks"; DROP TABLE x; --')).toThrow(
      /plain table name/,
    );
  });
});

describe('TenantIsolationSql maintenance policy', () => {
  it('lets through only a transaction marked as maintenance', () => {
    expect(TenantIsolationSql.allowMaintenance('tasks')).toEqual([
      `CREATE POLICY "tasks_maintenance" ON "tasks" USING (current_setting('app.maintenance', true) = 'on') WITH CHECK (current_setting('app.maintenance', true) = 'on')`,
    ]);
    expect(TenantIsolationSql.disallowMaintenance('tasks')).toEqual([
      'DROP POLICY IF EXISTS "tasks_maintenance" ON "tasks"',
    ]);
  });
});
