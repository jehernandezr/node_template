import { MigrationRange } from '../../shared/constants/migration-ranges.constants.js';
import { identityCatalogMigrations } from '../catalog-migrations.js';
import { identityShardMigrations } from '../shard-migrations.js';

describe('identity migrations', () => {
  it.each([
    ['shard', identityShardMigrations],
    ['catalog', identityCatalogMigrations],
  ])(
    'orders the %s migrations by the timestamp of their name, inside the module blocks',
    (_, migrations) => {
      const timestamps = migrations.map((migration) =>
        Number(/(\d{13})$/.exec(migration.name)?.[1]),
      );
      const blocks = Object.values(MigrationRange).filter(
        (value): value is number => typeof value === 'number',
      );

      expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
      expect(
        timestamps.every((timestamp) =>
          blocks.some(
            (start) => timestamp >= start && timestamp < start + 100_000,
          ),
        ),
      ).toBe(true);
    },
  );

  it('gives each module a timestamp block, in increasing order, 100 000 apart', () => {
    const starts = Object.values(MigrationRange).filter(
      (value): value is number => typeof value === 'number',
    );

    expect(starts).toHaveLength(13);
    for (let index = 1; index < starts.length; index += 1) {
      const previous = starts[index - 1] ?? 0;
      const current = starts[index] ?? 0;
      expect(current - previous).toBe(100_000);
    }
  });
});
