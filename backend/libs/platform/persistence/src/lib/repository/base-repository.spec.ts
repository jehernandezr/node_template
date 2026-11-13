import { PlatformErrorCode } from '@contracts/platform';
import { Criteria, SortDirection } from '@platform/criteria';
import { FixedClock } from '@platform/kernel/testing';
import { ShardingErrorCode } from '@platform/sharding';
import { memoryDatabase } from '../../../test/support/pg-mem.js';
import { RecordingConnection } from '../../../test/support/recording-connection.js';
import {
  newTask,
  TASK_MAPPER,
  TASKS_DDL,
  TASKS_TABLE,
  taskId,
  type Task,
  type TaskRecord,
} from '../../../test/support/tasks.js';
import type { PersistenceContext } from '../context/persistence-context.js';
import { Database } from '../database.js';
import { PersistenceErrorCode, RowLock } from '../enums.js';
import { OptimisticLockError } from '../errors.js';
import type { DatabaseResolver } from '../sharding/database-resolver.js';
import { BaseRepository } from './base-repository.js';

const START = new Date('2026-11-13T10:00:00.000Z');

class TaskRepository extends BaseRepository<Task, TaskRecord> {}

function setup(
  initial: PersistenceContext = { tenantId: 'tenant-1', actorId: 'user-1' },
) {
  const memory = memoryDatabase();
  memory.exec(TASKS_DDL);
  const clock = new FixedClock(START);
  let context = initial;
  const database = new Database({
    name: 'shard-1',
    connection: memory.connection,
    clock,
    context: () => context,
  });
  const repository = new TaskRepository({
    table: TASKS_TABLE,
    mapper: TASK_MAPPER,
    databases: database,
    clock,
  });
  return {
    memory,
    clock,
    database,
    repository,
    setContext: (next: PersistenceContext) => {
      context = next;
    },
  };
}

describe('BaseRepository on pg-mem', () => {
  describe('save', () => {
    it('inserts a new aggregate with version 1, tenant and audit columns', async () => {
      const { repository, memory } = setup();
      const saved = await repository.save(newTask(1));
      expect(saved).toMatchObject({
        id: taskId(1),
        version: 1,
        createdBy: 'user-1',
      });
      const [row] = memory.db.public.many('SELECT * FROM tasks');
      expect(row).toMatchObject({
        tenant_id: 'tenant-1',
        created_by: 'user-1',
        updated_by: 'user-1',
        deleted_at: null,
      });
      expect(new Date(row['created_at'] as string).getTime()).toBe(
        START.getTime(),
      );
    });

    it('updates with the expected version and increments it', async () => {
      const { repository, clock, setContext, memory } = setup();
      const saved = await repository.save(newTask(1));
      clock.advance(1_000);
      setContext({ tenantId: 'tenant-1', actorId: 'user-2' });
      const updated = await repository.save({ ...saved, title: 'renamed' });
      expect(updated).toMatchObject({
        title: 'renamed',
        version: 2,
        createdBy: 'user-1',
        updatedBy: 'user-2',
      });
      const [row] = memory.db.public.many('SELECT * FROM tasks');
      expect(new Date(row['updated_at'] as string).getTime()).toBe(
        START.getTime() + 1_000,
      );
      expect(new Date(row['created_at'] as string).getTime()).toBe(
        START.getTime(),
      );
    });

    it('throws VERSION_MISMATCH when the stored version moved on', async () => {
      const { repository } = setup();
      const saved = await repository.save(newTask(1));
      await repository.save({ ...saved, title: 'first writer' });
      const error = await repository
        .save({ ...saved, title: 'second writer' })
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(OptimisticLockError);
      expect(error).toMatchObject({
        code: PlatformErrorCode.ConflictVersionMismatch,
        retryable: false,
        details: { table: 'tasks', expectedVersion: 1 },
      });
    });

    it('does not update a row of another tenant', async () => {
      const { repository, setContext } = setup();
      const saved = await repository.save(newTask(1));
      setContext({ tenantId: 'tenant-2', actorId: 'user-9' });
      await expect(
        repository.save({ ...saved, title: 'hijack' }),
      ).rejects.toBeInstanceOf(OptimisticLockError);
    });

    it('requires a tenant in the context for a tenant scoped table', async () => {
      const { repository } = setup({ actorId: 'user-1' });
      await expect(repository.save(newTask(1))).rejects.toMatchObject({
        code: PersistenceErrorCode.TenantRequired,
      });
      await expect(repository.findById(taskId(1))).rejects.toMatchObject({
        code: PersistenceErrorCode.TenantRequired,
      });
    });

    it('saves many aggregates', async () => {
      const { repository } = setup();
      const saved = await repository.saveMany([newTask(1), newTask(2)]);
      expect(saved.map((task) => task.version)).toEqual([1, 1]);
      expect(await repository.count()).toBe(2);
    });
  });

  describe('upsert', () => {
    it('inserts and then replaces by id, keeping the creation columns', async () => {
      const { repository, setContext } = setup();
      await repository.upsert(newTask(1));
      setContext({ tenantId: 'tenant-1', actorId: 'user-2' });
      const replaced = await repository.upsert(
        newTask(1, { title: 'imported' }),
      );
      expect(replaced).toMatchObject({
        title: 'imported',
        version: 2,
        createdBy: 'user-1',
        updatedBy: 'user-2',
      });
    });
  });

  describe('reads', () => {
    it('finds by id, only inside the tenant of the context', async () => {
      const { repository, setContext } = setup();
      await repository.save(newTask(1));
      expect(await repository.findById(taskId(1))).toMatchObject({
        title: 'task 1',
      });
      setContext({ tenantId: 'tenant-2' });
      expect(await repository.findById(taskId(1))).toBeUndefined();
      expect(
        await repository.findById(taskId(1), { allTenants: true }),
      ).toMatchObject({
        title: 'task 1',
      });
    });

    it('paginates with the criteria cursor and mixed directions (row comparison is covered with real Postgres)', async () => {
      const { repository } = setup();
      await repository.saveMany(
        [1, 2, 3, 4, 5].map((n) => newTask(n, { priority: n % 2 })),
      );
      const criteria = Criteria.for<TaskRecord>()
        .where('status')
        .eq('open')
        .orderBy('priority', SortDirection.Desc)
        .orderBy('id', SortDirection.Asc)
        .limit(2);
      const first = await repository.findMany(criteria);
      expect(first.items.map((task) => task.id)).toEqual([
        taskId(1),
        taskId(3),
      ]);
      expect(first.nextCursor).not.toBeNull();
      const second = await repository.findMany(
        criteria.after(first.nextCursor as string),
      );
      expect(second.items.map((task) => task.id)).toEqual([
        taskId(5),
        taskId(2),
      ]);
      const third = await repository.findMany(
        criteria.after(second.nextCursor as string),
      );
      expect(third.items.map((task) => task.id)).toEqual([taskId(4)]);
      expect(third.nextCursor).toBeNull();
    });

    it('counts, checks existence and finds one', async () => {
      const { repository } = setup();
      await repository.saveMany([newTask(1), newTask(2, { status: 'done' })]);
      const done = Criteria.for<TaskRecord>().where('status').eq('done');
      expect(await repository.count(done)).toBe(1);
      expect(await repository.exists(done)).toBe(true);
      expect(
        await repository.exists(
          Criteria.for<TaskRecord>().where('status').eq('x'),
        ),
      ).toBe(false);
      expect(await repository.findOne(done)).toMatchObject({ id: taskId(2) });
    });

    it('streams every row in batches', async () => {
      const { repository } = setup();
      await repository.saveMany([1, 2, 3, 4, 5].map((n) => newTask(n)));
      const seen: string[] = [];
      for await (const task of repository.stream(Criteria.for<TaskRecord>(), {
        batchSize: 2,
      })) {
        seen.push(task.id);
      }
      expect(seen).toEqual([1, 2, 3, 4, 5].map(taskId));
    });

    it('rejects unknown fields from the criteria', async () => {
      const { repository } = setup();
      const criteria = Criteria.for<Record<string, unknown>>()
        .where('nope')
        .eq(1);
      await expect(
        repository.findMany(criteria as unknown as Criteria<TaskRecord>),
      ).rejects.toMatchObject({ code: 'PLATFORM.CRITERIA.UNKNOWN_FIELD' });
    });
  });

  describe('soft delete', () => {
    it('hides soft deleted rows unless asked and restores them', async () => {
      const { repository } = setup();
      await repository.save(newTask(1));
      expect(await repository.softDelete(taskId(1))).toBe(true);
      expect(await repository.softDelete(taskId(1))).toBe(false);
      expect(await repository.findById(taskId(1))).toBeUndefined();
      const deleted = await repository.findById(taskId(1), {
        withDeleted: true,
      });
      expect(deleted?.deletedAt).not.toBeNull();
      expect(deleted?.version).toBe(2);
      expect(await repository.restore(taskId(1))).toBe(true);
      expect(await repository.findById(taskId(1))).toMatchObject({
        version: 3,
      });
    });

    it('checks the expected version when given', async () => {
      const { repository } = setup();
      await repository.save(newTask(1));
      await expect(repository.softDelete(taskId(1), 7)).rejects.toBeInstanceOf(
        OptimisticLockError,
      );
    });
  });

  describe('locks', () => {
    it('requires a transaction for a pessimistic lock', async () => {
      const { repository } = setup();
      await expect(
        repository.findById(taskId(1), { lock: RowLock.ForUpdate }),
      ).rejects.toMatchObject({
        code: PersistenceErrorCode.TransactionRequired,
      });
    });

    it('appends the lock clause inside a transaction', async () => {
      const connection = new RecordingConnection();
      const database = new Database({
        name: 'shard-1',
        connection,
        context: () => ({ tenantId: 'tenant-1' }),
      });
      const repository = new TaskRepository({
        table: TASKS_TABLE,
        mapper: TASK_MAPPER,
        databases: database,
      });
      await database.runInTransaction(() =>
        repository.findById(taskId(1), { lock: RowLock.ForUpdate }),
      );
      const select = connection
        .sql()
        .find((sql) => sql.startsWith('SELECT "id"'));
      expect(select).toMatch(/ORDER BY "id" ASC LIMIT \$\d+ FOR UPDATE$/);
      expect(select).toContain('"deleted_at" IS NULL AND "tenant_id" = $');
    });
  });

  describe('acrossShards', () => {
    function crossShardSetup() {
      const shards = ['shard-a', 'shard-b'].map((name) => {
        const memory = memoryDatabase();
        memory.exec(TASKS_DDL);
        return new Database({
          name,
          connection: memory.connection,
          context: () => ({ tenantId: 'tenant-1', actorId: 'admin' }),
        });
      });
      const broken = new RecordingConnection();
      broken.acquireError = Object.assign(new Error('down'), {
        code: 'ECONNREFUSED',
      });
      const brokenShard = new Database({ name: 'shard-c', connection: broken });
      let includeBroken = false;
      let current = shards[0];
      const resolver: DatabaseResolver = {
        resolve: async () => current,
        all: async () => (includeBroken ? [...shards, brokenShard] : shards),
      };
      const repository = new TaskRepository({
        table: TASKS_TABLE,
        mapper: TASK_MAPPER,
        databases: resolver,
      });
      return {
        shards,
        repository,
        use: (index: number) => {
          current = shards[index];
        },
        breakOne: () => {
          includeBroken = true;
        },
      };
    }

    it('merges every shard ordered by id and paginates with an id cursor', async () => {
      const { repository, use } = crossShardSetup();
      use(0);
      await repository.saveMany([newTask(1), newTask(4), newTask(5)]);
      use(1);
      await repository.saveMany([newTask(2), newTask(3)]);
      const criteria = Criteria.for<TaskRecord>().orderBy('id').limit(2);
      const first = await repository.acrossShards(criteria);
      expect(first.items.map((task) => task.id)).toEqual([
        taskId(1),
        taskId(2),
      ]);
      expect(first.partial).toBe(false);
      const second = await repository.acrossShards(
        criteria.after(first.nextCursor as string),
      );
      expect(second.items.map((task) => task.id)).toEqual([
        taskId(3),
        taskId(4),
      ]);
      const third = await repository.acrossShards(
        criteria.after(second.nextCursor as string),
      );
      expect(third.items.map((task) => task.id)).toEqual([taskId(5)]);
      expect(third.nextCursor).toBeNull();
      const descending = await repository.acrossShards(
        Criteria.for<TaskRecord>().orderBy('id', SortDirection.Desc).limit(3),
      );
      expect(descending.items.map((task) => task.id)).toEqual([
        taskId(5),
        taskId(4),
        taskId(3),
      ]);
    });

    it('returns a partial page when a shard fails', async () => {
      const { repository, use, breakOne } = crossShardSetup();
      use(0);
      await repository.save(newTask(1));
      breakOne();
      const page = await repository.acrossShards(
        Criteria.for<TaskRecord>().limit(10),
      );
      expect(page.items.map((task) => task.id)).toEqual([taskId(1)]);
      expect(page.partial).toBe(true);
      expect(page.failures).toEqual([
        {
          shard: 'shard-c',
          timedOut: false,
          code: PersistenceErrorCode.QueryFailed,
        },
      ]);
    });

    it('only orders by id and never runs inside a transaction', async () => {
      const { repository, shards } = crossShardSetup();
      await expect(
        repository.acrossShards(Criteria.for<TaskRecord>().orderBy('title')),
      ).rejects.toMatchObject({
        code: PersistenceErrorCode.InvalidConfiguration,
      });
      await expect(
        shards[0].runInTransaction(() =>
          repository.acrossShards(Criteria.for<TaskRecord>()),
        ),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.CrossShardTransaction,
      });
    });
  });

  it('validates the table definition', () => {
    const { database } = setup();
    expect(
      () =>
        new TaskRepository({
          table: { ...TASKS_TABLE, name: 'tasks; drop' },
          mapper: TASK_MAPPER,
          databases: database,
        }),
    ).toThrow('table.name must be a plain SQL identifier');
    expect(
      () =>
        new TaskRepository({
          table: { ...TASKS_TABLE, version: 'missing' as keyof TaskRecord },
          mapper: TASK_MAPPER,
          databases: database,
        }),
    ).toThrow('table.version must be a field listed in columns');
  });
});
