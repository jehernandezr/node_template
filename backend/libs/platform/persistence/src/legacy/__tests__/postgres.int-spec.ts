import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { PlatformErrorCode } from '@contracts/platform';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { Criteria, SortDirection } from '@platform/criteria';
import { ActorType, RequestContext } from '@platform/observability';
import {
  InMemoryDirectoryStore,
  ShardingErrorCode,
  ShardKey,
  TenantStatus,
  type TenantPlacement,
} from '@platform/sharding';
import { Pool } from 'pg';
import { PgPoolConnection } from '../connection/pg-pool-connection.js';
import { Database } from '../database.js';
import { DataAccess, RowLock } from '../enums.js';
import { persistenceMigrations } from '../migrations/persistence-migrations.js';
import { auditTriggerSql } from '../../migrations/schema-helpers.js';
import {
  applyMigrations,
  PLATFORM_MIGRATIONS_TABLE,
} from '../migrations/sql-migration.js';
import { createPersistence } from '../persistence.js';
import { BaseRepository } from '../repository/base-repository.js';
import type { SqlSession } from '../sql/sql-session.js';
import {
  newTask,
  TASK_MAPPER,
  TASKS_TABLE,
  taskId,
  type Task,
  type TaskRecord,
} from './utils/tasks.js';

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
      actorId: userId,
      actorType: ActorType.User,
      userId,
      debugSampled: false,
    },
    fn,
  );
}

/** Sesión de la capa sobre un cliente dedicado de `pg`, para migrar. */
function sessionOf(client: {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{
    rows: Record<string, unknown>[];
    rowCount: number | null;
  }>;
}): SqlSession {
  return {
    query: async <Row>(sql: string, params?: readonly unknown[]) => {
      const result = await client.query(sql, params as unknown[]);
      return { rows: result.rows as Row[], rowCount: result.rowCount ?? 0 };
    },
  };
}

/** Espera a que `condition` se cumpla, consultando cada 20 ms, hasta 10 s. */
async function waitUntil(condition: () => Promise<boolean>): Promise<void> {
  const limit = Date.now() + 10_000;
  while (!(await condition())) {
    if (Date.now() > limit) {
      throw new Error('condition not met in time');
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function urlFor(
  container: StartedPostgreSqlContainer,
  database: string,
): string {
  const url = new URL(container.getConnectionUri());
  url.pathname = `/${database}`;
  return url.toString();
}

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable(
  'persistence against PostgreSQL (Testcontainers)',
  () => {
    let container: StartedPostgreSqlContainer;
    const pools: Pool[] = [];
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

      // Dos procesos que arrancan a la vez migran shard_1: el candado consultivo
      // hace que uno espere al otro y cada migración se aplique una sola vez.
      shard1Pool = pool('shard_1');
      const migrators = await Promise.all([
        shard1Pool.connect(),
        shard1Pool.connect(),
      ]);
      const applied = await Promise.all(
        migrators.map((client) =>
          applyMigrations(sessionOf(client), persistenceMigrations),
        ),
      );
      migrators.forEach((client) => client.release());
      expect(applied.flat()).toEqual(persistenceMigrations.map((m) => m.name));
      await shard1Pool.query(TASKS_DDL_UUID);
      for (const statement of auditTriggerSql('tasks', {
        exclude: ['secret'],
      })) {
        await shard1Pool.query(statement);
      }
      shard1 = new Database({
        name: 'shard-1',
        connection: new PgPoolConnection({ primary: shard1Pool }),
      });

      const shard2Pool = pool('shard_2');
      const session = await shard2Pool.connect();
      await applyMigrations(sessionOf(session), persistenceMigrations);
      await session.query(TASKS_DDL_UUID);
      session.release();
    });

    afterAll(async () => {
      // Un cliente que aún se despide cuando el contenedor se detiene recibe 57P01; sin oyente, el pool
      // lo emite como error no capturado y tumba la suite aunque todas las pruebas pasaron.
      for (const created of pools) {
        created.on('error', () => undefined);
      }
      // Algunos pools ya los cerró `persistence.close()`.
      await Promise.allSettled(pools.map((created) => created.end()));
      await container?.stop();
    });

    beforeEach(async () => {
      await shard1Pool.query('TRUNCATE tasks');
      await shard1Pool.query('TRUNCATE audit_log');
    });

    const tasks = () =>
      new TaskRepository({
        table: TASKS_TABLE,
        mapper: TASK_MAPPER,
        databases: shard1,
      });

    describe('migrations and platform functions', () => {
      it('recorded each migration once and created audit_log partitions', async () => {
        const applied = await shard1Pool.query<{ name: string }>(
          `SELECT name FROM ${PLATFORM_MIGRATIONS_TABLE} ORDER BY name`,
        );
        expect(applied.rows.map((row) => row.name)).toEqual(
          persistenceMigrations.map((m) => m.name).sort(),
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
        expect(update.old_values).toMatchObject({
          title: 'task 1',
          version: 1,
        });
        expect(update.new_values).toMatchObject({
          title: 'renamed',
          version: 2,
        });
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
      it('rolls back every write of the transaction, audit included', async () => {
        await expect(
          inRequest(TENANT_A, () =>
            shard1.runInTransaction(async () => {
              await tasks().save(newTask(1));
              await tasks().save(newTask(2));
              throw new Error('business failure');
            }),
          ),
        ).rejects.toThrow('business failure');
        expect((await shard1Pool.query('SELECT 1 FROM tasks')).rowCount).toBe(
          0,
        );
        expect(
          (await shard1Pool.query('SELECT 1 FROM audit_log')).rowCount,
        ).toBe(0);
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
        let locked: () => void = () => undefined;
        const firstLocked = new Promise<void>((resolve) => {
          locked = resolve;
        });
        const first = inRequest(TENANT_A, () =>
          shard1.runInTransaction(async () => {
            await repository.findById(taskId(1), { lock: RowLock.ForUpdate });
            order.push('first locked');
            locked();
            await held;
            order.push('first done');
          }),
        );
        await firstLocked;
        const second = inRequest(TENANT_A, () =>
          shard1.runInTransaction(async () => {
            await repository.findById(taskId(1), { lock: RowLock.ForUpdate });
            order.push('second locked');
          }),
        );
        // La segunda transacción queda esperando el candado de la fila.
        await waitUntil(async () => {
          const waiting = await shard1Pool.query<{ n: string }>(
            "SELECT count(*) AS n FROM pg_stat_activity WHERE datname = 'shard_1' AND wait_event_type = 'Lock'",
          );
          return Number(waiting.rows[0].n) > 0;
        });
        expect(order).toEqual(['first locked']);
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
        let page = await inRequest(TENANT_A, () =>
          repository.findMany(criteria),
        );
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

      const sharded = (directory: InMemoryDirectoryStore) =>
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
            directory: () =>
              Object.assign(directory, {
                listShards: async () => ['shard-1', 'shard-2'],
              }),
            router: { currentRegion: 'co' },
          },
        });

      it('routes each tenant to its shard, refuses cross-shard transactions and queries across shards', async () => {
        const directory = new InMemoryDirectoryStore();
        directory.setInstance('shard-1', 'instance-1');
        directory.setInstance('shard-2', 'instance-2');
        directory.setPlacement(placement(TENANT_A, 'shard-1', 1));
        directory.setPlacement(placement(TENANT_B, 'shard-2', 1));
        const persistence = sharded(directory);
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
  },
);
