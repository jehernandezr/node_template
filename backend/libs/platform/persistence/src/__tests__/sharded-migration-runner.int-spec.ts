import { ContainerRuntime } from '@platform/kernel/test-utils';
import { ProbeDatabaseSets } from './utils/probe-database-sets.js';
import { ShardedTestDatabase } from './utils/sharded-test-database.js';

jest.setTimeout(180_000);

const SHARD_A_LOCATION = {
  logicalShard: ShardedTestDatabase.SHARD_A,
  instance: ShardedTestDatabase.INSTANCE,
};

new ContainerRuntime(process.env).describeIfAvailable(
  'ShardedMigrationRunner against PostgreSQL',
  () => {
    describe('when the databases are already migrated', () => {
      const db = new ShardedTestDatabase({
        shard: ProbeDatabaseSets.shard,
        catalog: ProbeDatabaseSets.catalog,
      });

      beforeAll(async () => {
        await db.start();
        await db.migrate();
      });

      afterAll(async () => {
        await db.stop();
      });

      it('reports no applied migrations on a repeated run', async () => {
        const reports = await db.runner.migrateAll();

        expect(reports).toHaveLength(3);
        expect(reports.map((report) => report.applied)).toEqual([[], [], []]);
      });
    });

    describe('when two runs race on the same fresh shard', () => {
      const db = new ShardedTestDatabase({
        shard: ProbeDatabaseSets.shard,
        catalog: ProbeDatabaseSets.catalog,
      });

      beforeAll(async () => {
        await db.start();
      });

      afterAll(async () => {
        await db.stop();
      });

      it('applies each migration once and records each one in the migrations table', async () => {
        const reports = await Promise.all([
          db.runner.migrateShard(SHARD_A_LOCATION),
          db.runner.migrateShard(SHARD_A_LOCATION),
        ]);

        const applied = reports.flatMap((report) => report.applied);
        expect(new Set(applied).size).toBe(applied.length);
        expect(applied).toHaveLength(ProbeDatabaseSets.shard.migrations.length);
        const shard = await db.sources.get(SHARD_A_LOCATION);
        const rows: { n: number }[] = await shard.query(
          'SELECT count(*)::int AS n FROM migrations',
        );
        expect(rows[0].n).toBe(ProbeDatabaseSets.shard.migrations.length);
      });
    });
  },
);
