import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PlatformErrorCode } from '@contracts/platform';
import { Criteria, SortDirection } from '@platform/criteria';
import { SystemClock } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import { RequestContext } from '@platform/observability';
import { ClaimState, Deadline } from '@platform/primitives';
import {
  DirectoryWriteResult,
  ShardingErrorCode,
  ShardKey,
  TenantStatus,
  type TenantPlacement,
} from '@platform/sharding';
import { Pool } from 'pg';
import { DataSource } from 'typeorm';
import { PostgresIdempotencyStore } from '../../src/lib/adapters/postgres-idempotency-store.js';
import { PgPoolConnection } from '../../src/lib/connection/pg-pool-connection.js';
import { TypeOrmConnection } from '../../src/lib/connection/typeorm-connection.js';
import { Database } from '../../src/lib/database.js';
import { DataAccess, RowLock } from '../../src/lib/enums.js';
import { catalogMigrations } from '../../src/lib/migrations/catalog-migrations.js';
import { auditTriggerSql } from '../../src/lib/migrations/schema-helpers.js';
import { shardMigrations } from '../../src/lib/migrations/shard-migrations.js';
import {
  applyMigrations,
  toTypeOrmMigration,
} from '../../src/lib/migrations/sql-migration.js';
import { createPersistence } from '../../src/lib/persistence.js';
import { BaseRepository } from '../../src/lib/repository/base-repository.js';
import { describeWithDocker } from '../support/docker.js';
import { idempotencyStoreContract } from '../support/idempotency-contract.js';
import {
  newTask,
  TASK_MAPPER,
  TASKS_TABLE,
  taskId,
  type Task,
  type TaskRecord,
} from '../support/tasks.js';

jest.setTimeout(180_000);

const TASKS_DDL_UUID = `CREATE TABLE tasks (
  id uuid PRIMARY KEY,
  tenant_id text NOT NULL,
  title text NOT NULL,
  status text NOT NULL,
  priority integer NOT NULL,
  secret text,
  version integer NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  created_by text,
  updated_by text,
  deleted_at timestamptz
)`;

const TENANT_A = '0193f1c2-0000-7000-8000-0000000000a1';
const TENANT_B = '0193f1c2-0000-7000-8000-0000000000b2';
const TRACE = '0193f1c2-0000-7000-8000-00000000c0de';
/** RequestContext guarda el traceId normalizado al formato W3C (32 hex). */
const TRACE_W3C = TRACE.replaceAll('-', '');

class TaskRepository extends BaseRepository<Task, TaskRecord> {}

function inRequest<T>(
  tenantId: string | undefined,
  fn: () => Promise<T>,
  userId = 'user-1',
): Promise<T> {
  return RequestContext.run(
    {
      traceId: TRACE,
      spanId: '00f067aa0ba902b7',
      tenantId,
      userId,
      debugSampled: false,
    },
    fn,
  );
}

function urlFor(
  container: StartedPostgreSqlContainer,
  database: string,
): string {
  const url = new URL(container.getConnectionUri());
  url.pathname = `/${database}`;
  return url.toString();
}

describeWithDocker('persistence against PostgreSQL (Testcontainers)', () => {
  let container: StartedPostgreSqlContainer;
  const pools: Pool[] = [];
  let dataSource: DataSource;
  let shard1: Database;
  let shard1Pool: Pool;

  const pool = (database: string, max = 10): Pool => {
    const created = new Pool({
      connectionString: urlFor(container, database),
      max,
    });
    pools.push(created);
    return created;
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17').start();
    const admin = pool(container.getDatabase(), 1);
    for (const name of ['shard_1', 'shard_2', 'catalog']) {
      await admin.query(`CREATE DATABASE ${name}`);
    }

    // shard_1 migra con TypeORM, como un servicio real con `migration:run`.
    dataSource = new DataSource({
      type: 'postgres',
      url: urlFor(container, 'shard_1'),
      synchronize: false,
      migrations: shardMigrations.map(toTypeOrmMigration),
    });
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });
    await dataSource.query(TASKS_DDL_UUID);
    for (const statement of auditTriggerSql('tasks', { exclude: ['secret'] })) {
      await dataSource.query(statement);
    }
    shard1 = new Database({
      name: 'shard-1',
      connection: new TypeOrmConnection(dataSource),
    });

    // shard_2 y el catálogo migran con applyMigrations sobre pg.
    shard1Pool = pool('shard_1');
    const shard2Pool = pool('shard_2');
    const session = await shard2Pool.connect();
    await applyMigrations(
      {
        query: async (sql, params) => {
          const result = await session.query(sql, params as unknown[]);
          return { rows: result.rows, rowCount: result.rowCount ?? 0 };
        },
      },
      shardMigrations,
    );
    await session.query(TASKS_DDL_UUID);
    session.release();
    const catalogSession = await pool('catalog').connect();
    await applyMigrations(
      {
        query: async (sql, params) => {
          const result = await catalogSession.query(sql, params as unknown[]);
          return { rows: result.rows, rowCount: result.rowCount ?? 0 };
        },
      },
      catalogMigrations,
    );
    catalogSession.release();
  });

  afterAll(async () => {
    await dataSource?.destroy();
    // Algunos pools ya los cerró `persistence.close()`.
    await Promise.allSettled(pools.map((created) => created.end()));
    await container?.stop();
  });

  beforeEach(async () => {
    await shard1Pool.query('TRUNCATE tasks');
    await shard1Pool.query('TRUNCATE audit_log');
    await shard1Pool.query('TRUNCATE idempotency_keys');
  });

  const tasks = () =>
    new TaskRepository({
      table: TASKS_TABLE,
      mapper: TASK_MAPPER,
      databases: shard1,
    });

  describe('migrations and platform functions', () => {
    it('ran through TypeORM and created audit_log partitions', async () => {
      const applied = await shard1Pool.query<{ name: string }>(
        'SELECT name FROM migrations ORDER BY id',
      );
      expect(applied.rows.map((row) => row.name)).toEqual(
        shardMigrations.map((m) => m.name),
      );
      const partitions = await shard1Pool.query<{ n: string }>(
        `SELECT count(*) AS n FROM pg_inherits i JOIN pg_class p ON p.oid = i.inhparent WHERE p.relname = 'audit_log'`,
      );
      expect(Number(partitions.rows[0].n)).toBe(5);
      const detached = await shard1Pool.query<{ n: number }>(
        `SELECT platform_detach_partitions_before('audit_log', 'month', now() - interval '1 year') AS n`,
      );
      expect(detached.rows[0].n).toBe(0);
    });

    it('generates UUIDv7 in the database for trigger rows', async () => {
      const result = await shard1Pool.query<{ id: string }>(
        'SELECT platform_uuid_v7()::text AS id',
      );
      expect(result.rows[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('audit and session settings', () => {
    it('audits insert, changed fields of an update and soft delete with actor, tenant and trace', async () => {
      const repository = tasks();
      const saved = await inRequest(TENANT_A, () =>
        repository.save(newTask(1, { secret: 'hunter2' })),
      );
      await inRequest(
        TENANT_A,
        () => repository.save({ ...saved, title: 'renamed' }),
        'user-2',
      );
      await inRequest(TENANT_A, () => repository.softDelete(saved.id));

      const audit = await shard1Pool.query(
        'SELECT operation, row_id, old_values, new_values, actor_id, tenant_id, trace_id FROM audit_log ORDER BY id',
      );
      expect(audit.rows).toHaveLength(3);
      const [insert, update, softDelete] = audit.rows;
      expect(insert).toMatchObject({
        operation: 'INSERT',
        row_id: taskId(1),
        actor_id: 'user-1',
        tenant_id: TENANT_A,
        trace_id: TRACE_W3C,
        old_values: null,
      });
      expect(insert.new_values).not.toHaveProperty('secret');
      expect(update.actor_id).toBe('user-2');
      expect(Object.keys(update.new_values).sort()).toEqual(
        ['title', 'updated_at', 'updated_by', 'version'].sort(),
      );
      expect(update.old_values).toMatchObject({ title: 'task 1', version: 1 });
      expect(update.new_values).toMatchObject({ title: 'renamed', version: 2 });
      expect(softDelete.new_values).toHaveProperty('deleted_at');
    });

    it('keeps audit_log append only', async () => {
      await inRequest(TENANT_A, () => tasks().save(newTask(1)));
      await expect(
        shard1Pool.query("UPDATE audit_log SET actor_id = 'forged'"),
      ).rejects.toThrow('audit_log is append only');
      await expect(shard1Pool.query('DELETE FROM audit_log')).rejects.toThrow(
        'append only',
      );
    });

    it('sets the settings only inside the transaction, so a pooled connection never leaks them', async () => {
      const single = new Database({
        name: 'shard-1',
        connection: new PgPoolConnection({ primary: pool('shard_1', 1) }),
      });
      const inside = await inRequest(TENANT_A, () =>
        single.runInTransaction((uow) =>
          uow.session.query<{ tenant: string; actor: string }>(
            "SELECT current_setting('app.tenant_id', true) AS tenant, current_setting('app.actor_id', true) AS actor",
          ),
        ),
      );
      expect(inside.rows[0]).toEqual({ tenant: TENANT_A, actor: 'user-1' });
      const after = await single.read((session) =>
        session.query<{ tenant: string | null }>(
          "SELECT current_setting('app.tenant_id', true) AS tenant",
        ),
      );
      expect(after.rows[0].tenant ?? '').toBe('');
    });

    it('prefixes each statement with the trace comment', async () => {
      const result = await inRequest(TENANT_A, () =>
        shard1.read((session) =>
          session.query<{ q: string }>('SELECT current_query() AS q'),
        ),
      );
      expect(result.rows[0].q).toBe(
        `/* traceId=${TRACE_W3C} tenantId=${TENANT_A} */ SELECT current_query() AS q`,
      );
    });
  });

  describe('unit of work', () => {
    it('rolls back every write of the transaction, idempotency included', async () => {
      const clock = new FixedClock(new Date());
      const store = new PostgresIdempotencyStore<{ orderId: string }>({
        databases: shard1,
        ids: new SequentialIdGenerator(),
        clock,
      });
      const claim = await store.claim('k', {
        fingerprint: 'fp',
        deadline: Deadline.after(1_000, clock),
      });
      if (claim.state !== ClaimState.Acquired) {
        throw new Error('expected acquired');
      }
      await expect(
        inRequest(TENANT_A, () =>
          shard1.runInTransaction(async () => {
            await tasks().save(newTask(1));
            await store.complete('k', claim.claimToken, { orderId: 'o-1' });
            throw new Error('business failure');
          }),
        ),
      ).rejects.toThrow('business failure');
      expect((await shard1Pool.query('SELECT 1 FROM tasks')).rowCount).toBe(0);
      expect((await shard1Pool.query('SELECT 1 FROM audit_log')).rowCount).toBe(
        0,
      );
      const again = await store.claim('k', {
        fingerprint: 'fp',
        deadline: Deadline.after(1_000, clock),
      });
      expect(again.state).toBe(ClaimState.InProgress);
    });

    it('lets exactly one of two concurrent writers of the same version win', async () => {
      const repository = tasks();
      const saved = await inRequest(TENANT_A, () =>
        repository.save(newTask(1)),
      );
      const results = await Promise.allSettled([
        inRequest(TENANT_A, () => repository.save({ ...saved, title: 'a' })),
        inRequest(TENANT_A, () => repository.save({ ...saved, title: 'b' })),
      ]);
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toMatchObject({
        code: PlatformErrorCode.ConflictVersionMismatch,
      });
    });

    it('locks a row for update inside a transaction', async () => {
      const repository = tasks();
      await inRequest(TENANT_A, () => repository.save(newTask(1)));
      const order: string[] = [];
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const first = inRequest(TENANT_A, () =>
        shard1.runInTransaction(async () => {
          await repository.findById(taskId(1), { lock: RowLock.ForUpdate });
          order.push('first locked');
          await held;
          order.push('first done');
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      const second = inRequest(TENANT_A, () =>
        shard1.runInTransaction(async () => {
          await repository.findById(taskId(1), { lock: RowLock.ForUpdate });
          order.push('second locked');
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
      release();
      await Promise.all([first, second]);
      expect(order).toEqual(['first locked', 'first done', 'second locked']);
    });
  });

  describe('criteria on real PostgreSQL', () => {
    it('paginates with the row comparison keyset', async () => {
      const repository = tasks();
      await inRequest(TENANT_A, () =>
        repository.saveMany(
          [1, 2, 3, 4, 5].map((n) => newTask(n, { priority: n % 2 })),
        ),
      );
      const criteria = Criteria.for<TaskRecord>()
        .orderBy('priority', SortDirection.Desc)
        .limit(2);
      const seen: string[] = [];
      let page = await inRequest(TENANT_A, () => repository.findMany(criteria));
      seen.push(...page.items.map((task) => task.id));
      while (page.nextCursor !== null) {
        const cursor = page.nextCursor;
        page = await inRequest(TENANT_A, () =>
          repository.findMany(criteria.after(cursor)),
        );
        seen.push(...page.items.map((task) => task.id));
      }
      expect(seen).toEqual([5, 3, 1, 4, 2].map(taskId));
    });
  });

  describe('PostgresIdempotencyStore', () => {
    describe('contract', () => {
      idempotencyStoreContract(async () => {
        await shard1Pool.query('TRUNCATE idempotency_keys');
        const start = new Date('2026-11-12T10:00:00.000Z');
        const clock = new FixedClock(start);
        return {
          clock,
          start,
          store: new PostgresIdempotencyStore<{ orderId: string }>({
            databases: shard1,
            ids: new SequentialIdGenerator(start),
            clock,
          }),
        };
      });
    });

    it('gives exactly one acquirer among concurrent claims', async () => {
      const clock = new SystemClock();
      const ids = new SequentialIdGenerator();
      const stores = Array.from(
        { length: 8 },
        () =>
          new PostgresIdempotencyStore({
            databases: new Database({
              name: 'shard-1',
              connection: new PgPoolConnection({ primary: shard1Pool }),
            }),
            ids,
            clock,
          }),
      );
      const results = await Promise.all(
        stores.map((store) =>
          store.claim('race', {
            fingerprint: 'fp',
            deadline: Deadline.after(5_000, clock),
          }),
        ),
      );
      expect(
        results.filter((r) => r.state === ClaimState.Acquired),
      ).toHaveLength(1);
      expect(
        results.filter((r) => r.state === ClaimState.InProgress),
      ).toHaveLength(7);
    });
  });

  describe('sharding', () => {
    const placement = (
      tenantId: string,
      shard: string,
      version: number,
    ): TenantPlacement => ({
      tenantId,
      region: 'co',
      shardGroup: [shard],
      status: TenantStatus.Active,
      version,
      dedicated: false,
    });

    const sharded = () =>
      createPersistence({
        catalog: new PgPoolConnection({ primary: pool('catalog') }),
        sharding: {
          key: ShardKey.Tenant,
          connect: (target) =>
            new PgPoolConnection({
              primary: pool(
                target.logicalShard === 'shard-1' ? 'shard_1' : 'shard_2',
              ),
            }),
          router: { currentRegion: 'co' },
        },
      });

    it('keeps the highest version when placements race', async () => {
      const persistence = sharded();
      const directory = persistence.directory;
      if (directory === undefined) {
        throw new Error('expected a directory');
      }
      const tenant = '0193f1c2-0000-7000-8000-0000000000f1';
      const versions = [7, 3, 12, 1, 9, 12, 5, 2, 11, 4, 8, 6, 10];
      const written = await Promise.all(
        versions.map((version) =>
          directory.setPlacementIfNewer(
            placement(tenant, `shard-v${version}`, version),
          ),
        ),
      );
      const stored = await directory.getPlacement(tenant);
      expect(stored?.version).toBe(12);
      expect(stored?.shardGroup).toEqual(['shard-v12']);
      expect(written.filter(Boolean).length).toBeGreaterThanOrEqual(1);
      expect(
        await directory.setPlacementIfNewer(placement(tenant, 'shard-x', 12)),
      ).toBe(false);
    });

    it('lets only one dedicated tenant take an empty shard when placements race', async () => {
      const persistence = sharded();
      const directory = persistence.directory;
      if (directory === undefined) {
        throw new Error('expected a directory');
      }
      const tenants = Array.from(
        { length: 8 },
        (_, index) => `0193f1c2-0000-7000-8000-0000000001${index}0`,
      );
      const results = await Promise.all(
        tenants.map((tenantId) =>
          directory.putPlacement(
            { ...placement(tenantId, 'shard-empty', 1), dedicated: true },
            undefined,
          ),
        ),
      );
      expect(
        results.filter((r) => r === DirectoryWriteResult.Written),
      ).toHaveLength(1);
      expect(
        results.filter((r) => r === DirectoryWriteResult.ShardTaken),
      ).toHaveLength(7);
      expect(await directory.listPlacements('co')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ shardGroup: ['shard-empty'] }),
        ]),
      );
    });

    it('lets one of several concurrent updates win by version', async () => {
      const persistence = sharded();
      const directory = persistence.directory;
      if (directory === undefined) {
        throw new Error('expected a directory');
      }
      const tenant = '0193f1c2-0000-7000-8000-0000000002f1';
      expect(
        await directory.putPlacement(
          placement(tenant, 'shard-cas', 1),
          undefined,
        ),
      ).toBe(DirectoryWriteResult.Written);
      const results = await Promise.all(
        ['shard-cas-a', 'shard-cas-b', 'shard-cas-c', 'shard-cas-d'].map(
          (shard) => directory.putPlacement(placement(tenant, shard, 2), 1),
        ),
      );
      expect(
        results.filter((r) => r === DirectoryWriteResult.Written),
      ).toHaveLength(1);
      expect(
        results.filter((r) => r === DirectoryWriteResult.VersionConflict),
      ).toHaveLength(3);
      expect((await directory.getPlacement(tenant))?.version).toBe(2);
    });

    it('routes each tenant to its shard, refuses cross-shard transactions and queries across shards', async () => {
      const persistence = sharded();
      const directory = persistence.directory;
      if (directory === undefined) {
        throw new Error('expected a directory');
      }
      await directory.setInstance('shard-1', 'instance-1');
      await directory.setInstance('shard-2', 'instance-2');
      await directory.setPlacementIfNewer(placement(TENANT_A, 'shard-1', 1));
      await directory.setPlacementIfNewer(placement(TENANT_B, 'shard-2', 1));
      const repository = new TaskRepository({
        table: TASKS_TABLE,
        mapper: TASK_MAPPER,
        databases: persistence.databases,
      });
      await inRequest(TENANT_A, () =>
        repository.saveMany([newTask(11), newTask(13)]),
      );
      await inRequest(TENANT_B, () => repository.save(newTask(12)));
      expect(
        (
          await shard1Pool.query('SELECT id FROM tasks WHERE id = $1', [
            taskId(12),
          ])
        ).rowCount,
      ).toBe(0);
      expect(
        await inRequest(
          TENANT_A,
          async () =>
            (await persistence.databases.resolve(DataAccess.Read)).name,
        ),
      ).toBe('shard-1');

      const crossShard = await inRequest(TENANT_A, () =>
        persistence.transactions.runInTransaction(async () => {
          await inRequest(TENANT_B, () => repository.save(newTask(14)));
        }),
      ).catch((caught: unknown) => caught);
      expect(crossShard).toMatchObject({
        code: ShardingErrorCode.CrossShardTransaction,
      });

      const page = await inRequest(undefined, () =>
        repository.acrossShards(
          Criteria.for<TaskRecord>().orderBy('id').limit(10),
          {
            allTenants: true,
          },
        ),
      );
      expect(page.partial).toBe(false);
      expect(page.items.map((task) => task.id)).toEqual(
        [11, 12, 13].map(taskId),
      );
      await persistence.close();
    });
  });
});
