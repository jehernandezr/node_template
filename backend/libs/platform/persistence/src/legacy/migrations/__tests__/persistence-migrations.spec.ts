import { persistenceMigrations } from '../persistence-migrations.js';
import { assertMigrations } from '../sql-migration.js';

describe('migrations', () => {
  it('are named for TypeORM and strictly ordered', () => {
    expect(() => assertMigrations(persistenceMigrations)).not.toThrow();
    expect(() =>
      assertMigrations([...persistenceMigrations].reverse()),
    ).toThrow('migration order must be strictly increasing timestamps');
    expect(() =>
      assertMigrations([{ name: 'NoTimestamp', up: [], down: [] }]),
    ).toThrow(
      'migration name must be letters and digits ending in a 13 digit timestamp',
    );
  });
});
