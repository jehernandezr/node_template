import { PlatformAuditLog1794600000002 } from '../migrations/platform-audit-log.migration.js';
import { PlatformFunctions1794600000001 } from '../migrations/platform-functions.migration.js';
import { PlatformOwnerMaintenance1794600000003 } from '../migrations/platform-owner-maintenance.migration.js';
import { PlatformPartitionGuard1794600000004 } from '../migrations/platform-partition-guard.migration.js';
import { PlatformPersistenceMigrations } from '../migrations/platform-persistence-migrations.js';
import { PlatformSchemaSql } from '../migrations/platform-schema-sql.js';
import { StubDataSource } from './utils/stub-data-source.js';

/** Statements as recorded by `StubQueryRunner.calls`, without parameters. */
function recorded(statements: readonly string[]): string[] {
  return statements.map((statement) => `query ${statement} []`);
}

describe('platform persistence migrations', () => {
  it('names every migration with a 13 digit timestamp in strictly increasing order', () => {
    const timestamps = PlatformPersistenceMigrations.shard.map((migration) => {
      const digits = /(\d{13})$/.exec(migration.name)?.[1];
      return Number(digits);
    });

    expect(timestamps.every((timestamp) => Number.isFinite(timestamp))).toBe(
      true,
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    expect(new Set(timestamps).size).toBe(timestamps.length);
  });

  it('runs every function statement on up and every reverse statement on down', async () => {
    const dataSource = new StubDataSource('functions');
    await dataSource.initialize();
    const runner = dataSource.createQueryRunner();
    const migration = new PlatformFunctions1794600000001();

    await migration.up(runner);
    await migration.down(runner);

    expect(dataSource.runners[0].calls).toEqual([
      ...recorded(PlatformSchemaSql.functionsUp),
      ...recorded(PlatformSchemaSql.functionsDown),
    ]);
  });

  it('runs every audit log statement on up and down in order', async () => {
    const dataSource = new StubDataSource('audit');
    await dataSource.initialize();
    const runner = dataSource.createQueryRunner();
    const migration = new PlatformAuditLog1794600000002();

    await migration.up(runner);
    await migration.down(runner);

    expect(dataSource.runners[0].calls).toEqual([
      ...recorded(PlatformSchemaSql.auditLogUp),
      ...recorded(PlatformSchemaSql.auditLogDown),
    ]);
  });

  it('runs the owner maintenance statements on up and their reverse on down', async () => {
    const dataSource = new StubDataSource('maintenance');
    await dataSource.initialize();
    const runner = dataSource.createQueryRunner();
    const migration = new PlatformOwnerMaintenance1794600000003();

    await migration.up(runner);
    await migration.down(runner);

    expect(dataSource.runners[0].calls).toEqual([
      ...recorded(PlatformSchemaSql.ownerMaintenanceUp),
      ...recorded(PlatformSchemaSql.ownerMaintenanceDown),
    ]);
  });

  it('runs every partition function with the rights of the table owner', () => {
    const definer = PlatformSchemaSql.ownerMaintenanceUp.join('\n');

    for (const fn of [
      'platform_ensure_partitions',
      'platform_detach_partitions_before',
      'platform_drop_partition',
    ]) {
      expect(definer).toMatch(
        new RegExp(
          `${fn}\\([^)]*\\)[\\s\\S]*?SECURITY DEFINER SET search_path = public`,
        ),
      );
    }
  });

  it('runs the partition guard statements on up and their reverse on down', async () => {
    const dataSource = new StubDataSource('guard');
    await dataSource.initialize();
    const runner = dataSource.createQueryRunner();
    const migration = new PlatformPartitionGuard1794600000004();

    await migration.up(runner);
    await migration.down(runner);

    expect(dataSource.runners[0].calls).toEqual([
      ...recorded(PlatformSchemaSql.partitionGuardUp),
      ...recorded(PlatformSchemaSql.partitionGuardDown),
    ]);
  });

  it('keeps the partition functions from PUBLIC and limits them to registered tables', () => {
    const guard = PlatformSchemaSql.partitionGuardUp.join('\n');

    for (const signature of [
      'platform_ensure_partitions(text, text, integer)',
      'platform_detach_partitions_before(text, text, timestamptz)',
      'platform_drop_partition(text, text)',
    ]) {
      expect(guard).toContain(
        `REVOKE EXECUTE ON FUNCTION ${signature} FROM PUBLIC`,
      );
    }
    expect(guard.match(/FROM platform_partitioned_tables t/g)).toHaveLength(3);
    expect(
      guard.match(/SECURITY DEFINER SET search_path = public/g),
    ).toHaveLength(3);
  });
});
