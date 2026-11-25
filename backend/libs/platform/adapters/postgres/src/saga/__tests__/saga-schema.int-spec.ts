import { ContainerRuntime } from '@platform/kernel/test-utils';
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import { DataSource } from 'typeorm';
import { CreateSagaSchema1795000000001 } from '../migrations/1795000000001-create-saga-schema.migration.js';
import { platformSagaShardEntities } from '../platform-saga-shard-entities.js';
import { SagaTestDatabase } from './utils/saga-test-database.js';

jest.setTimeout(180_000);

const INSERT_ROW = `INSERT INTO "saga"."instances" ("id", "tenant_id", "type", "status", "current_step", "direction", "version", "attempts", "input_digest", "created_at", "updated_at")
  VALUES ('0193f1c2-0000-7000-8000-0000000000e1', '${ShardedTestDatabase.TENANT_A}', 'test', $1, 0, 'forward', 0, 0, 'digest', now(), now())`;

new ContainerRuntime(process.env).describeIfAvailable(
  'saga schema in the shard',
  () => {
    const saga = new SagaTestDatabase();
    const location = {
      logicalShard: ShardedTestDatabase.SHARD_A,
      instance: ShardedTestDatabase.INSTANCE,
    };

    beforeAll(async () => {
      await saga.db.start();
      await saga.db.migrate();
    });

    afterAll(async () => {
      await saga.db.stop();
    });

    /** Direct connection to shard A, with the saga entities. */
    async function shardA(): Promise<DataSource> {
      return saga.db.sources.get(location);
    }

    it('(a) the entities match the migrated schema: no pending statements', async () => {
      const source = await shardA();
      const dataSource = new DataSource({
        ...source.options,
        entities: [...platformSagaShardEntities],
        migrations: [],
        synchronize: false,
      } as never);
      await dataSource.initialize();
      try {
        const pending = await dataSource.driver.createSchemaBuilder().log();

        expect(pending.upQueries.map((q) => q.query)).toEqual([]);
      } finally {
        await dataSource.destroy();
      }
    });

    it('(b) the three partial indexes exist with their predicate', async () => {
      const source = await shardA();
      const rows: { indexname: string; indexdef: string }[] =
        await source.query(
          `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'saga' AND tablename = 'instances'`,
        );
      const byName = new Map(rows.map((row) => [row.indexname, row.indexdef]));

      expect(byName.get('saga_instances_tenant_key_uq')).toMatch(
        /UNIQUE INDEX.*\(tenant_id, idempotency_key\).*WHERE \(idempotency_key IS NOT NULL\)/,
      );
      expect(byName.get('saga_instances_open_idx')).toMatch(
        /WHERE .*running.*compensating.*suspended/,
      );
      expect(byName.get('saga_instances_purge_idx')).toMatch(
        /WHERE .*completed.*compensated/,
      );
    });

    it('(c) the status CHECK rejects an invalid status', async () => {
      const source = await shardA();

      await expect(
        source.query(INSERT_ROW, ['does-not-exist']),
      ).rejects.toThrow(/saga_instances_status_check/);
    });

    it('(d) reverting and reapplying the migration leaves the schema unchanged', async () => {
      const source = await shardA();
      const migration = new CreateSagaSchema1795000000001();
      const queryRunner = source.createQueryRunner();
      try {
        await migration.down(queryRunner);
        await migration.up(queryRunner);
      } finally {
        await queryRunner.release();
      }
      const dataSource = new DataSource({
        ...source.options,
        entities: [...platformSagaShardEntities],
        migrations: [],
        synchronize: false,
      } as never);
      await dataSource.initialize();
      try {
        const pending = await dataSource.driver.createSchemaBuilder().log();

        expect(pending.upQueries.map((q) => q.query)).toEqual([]);
      } finally {
        await dataSource.destroy();
      }
    });
  },
);
