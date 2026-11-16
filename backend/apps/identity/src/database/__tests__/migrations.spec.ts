import { MigrationRange } from '../../shared/constants/migration-ranges.constants.js';
import { identityCatalogMigrations } from '../catalog-migrations.js';
import { identityShardMigrations } from '../shard-migrations.js';

describe('identity migrations', () => {
  it('has no migrations yet in either database set', () => {
    expect(identityShardMigrations).toEqual([]);
    expect(identityCatalogMigrations).toEqual([]);
  });

  it('gives each module a timestamp block, in increasing order, 100 000 apart', () => {
    const starts = Object.values(MigrationRange).filter(
      (value): value is number => typeof value === 'number',
    );

    expect(starts).toHaveLength(11);
    for (let index = 1; index < starts.length; index += 1) {
      const previous = starts[index - 1] ?? 0;
      const current = starts[index] ?? 0;
      expect(current - previous).toBe(100_000);
    }
  });
});
