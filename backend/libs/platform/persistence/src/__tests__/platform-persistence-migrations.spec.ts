import { PlatformAuditLog1794600000002 } from '../migrations/platform-audit-log.migration.js';
import { PlatformFunctions1794600000001 } from '../migrations/platform-functions.migration.js';
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
});
