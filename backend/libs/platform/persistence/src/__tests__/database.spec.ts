import { PlatformErrorCode } from '@contracts/platform';
import { ActorType } from '@platform/observability';
import { FailureKind, IsolationLevel } from '@platform/primitives';
import {
  ShardingError,
  ShardingErrorCode,
  TransactionShardGuard,
} from '@platform/sharding';
import { RecordingConnection } from './utils/recording-connection.js';
import type { PersistenceContext } from '../context/persistence-context.js';
import { currentUnitOfWork, Database } from '../database.js';
import { DatabaseRole, SessionSetting } from '../enums.js';
import { PersistenceError } from '../errors.js';

const CONTEXT: PersistenceContext = {
  traceId: '0193f1c2-0000-7000-8000-000000000001',
  tenantId: 'tenant-1',
  actorId: 'user-1',
  actorType: ActorType.User,
};

function setup(
  options: {
    name?: string;
    global?: boolean;
    context?: PersistenceContext;
  } = {},
) {
  const connection = new RecordingConnection();
  const hookErrors: unknown[] = [];
  let context = options.context ?? CONTEXT;
  const database = new Database({
    name: options.name ?? 'shard-1',
    global: options.global,
    connection,
    context: () => context,
    onHookError: (error) => hookErrors.push(error),
  });
  return {
    connection,
    database,
    hookErrors,
    setContext: (next: PersistenceContext) => {
      context = next;
    },
  };
}

describe('Database', () => {
  describe('transactions', () => {
    it('opens, sets the session settings locally, runs and commits on the primary', async () => {
      const { connection, database } = setup();
      const result = await database.runInTransaction(async (uow) => {
        await uow.session.query('SELECT 1');
        return 'done';
      });
      expect(result).toBe('done');
      expect(connection.sql()).toEqual([
        'BEGIN',
        'SELECT set_config($1, $2, true), set_config($3, $4, true), set_config($5, $6, true), set_config($7, $8, true)',
        'SELECT 1',
        'COMMIT',
      ]);
      expect(connection.statements[1].params).toEqual([
        SessionSetting.ActorId,
        'user-1',
        SessionSetting.ActorType,
        'user',
        SessionSetting.TenantId,
        'tenant-1',
        SessionSetting.TraceId,
        CONTEXT.traceId,
      ]);
      expect(new Set(connection.statements.map((s) => s.role))).toEqual(
        new Set([DatabaseRole.Primary]),
      );
      expect(connection.released).toEqual([{ session: 1, discarded: false }]);
    });

    it('prefixes every statement with the trace comment', async () => {
      const { connection, database } = setup();
      await database.runInTransaction(async (uow) => {
        await uow.session.query('SELECT 1');
      });
      for (const statement of connection.statements) {
        expect(
          statement.sql.startsWith(
            `/* traceId=${CONTEXT.traceId} tenantId=tenant-1 */ `,
          ),
        ).toBe(true);
      }
    });

    it('sets empty settings when the context has no actor, tenant or trace', async () => {
      const { connection, database } = setup({ context: {} });
      await database.runInTransaction(async () => undefined);
      expect(
        connection.statements[1].params.filter((_, i) => i % 2 === 1),
      ).toEqual(['', '', '', '']);
      expect(connection.statements[0].sql).toBe('BEGIN');
    });

    it('applies isolation, read only and statement timeout', async () => {
      const { connection, database } = setup();
      await database.runInTransaction(async () => undefined, {
        isolation: IsolationLevel.Serializable,
        readOnly: true,
        statementTimeoutMs: 250,
      });
      expect(connection.sql()[0]).toBe(
        'BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY',
      );
      expect(connection.statements[1].params.slice(-2)).toEqual([
        'statement_timeout',
        '250',
      ]);
    });

    it('rejects an invalid statement timeout before touching the database', async () => {
      const { connection, database } = setup();
      await expect(
        database.runInTransaction(async () => undefined, {
          statementTimeoutMs: 0,
        }),
      ).rejects.toMatchObject({
        code: PlatformErrorCode.PersistenceInvalidConfig,
      });
      expect(connection.statements).toEqual([]);
    });

    it('rolls back, runs rollback hooks and rethrows the original error', async () => {
      const { connection, database } = setup();
      const committed = jest.fn();
      const rolledBack = jest.fn();
      const failure = new Error('business rule');
      await expect(
        database.runInTransaction(async (uow) => {
          uow.afterCommit(committed);
          uow.afterRollback(rolledBack);
          throw failure;
        }),
      ).rejects.toBe(failure);
      expect(connection.sql().at(-1)).toBe('ROLLBACK');
      expect(committed).not.toHaveBeenCalled();
      expect(rolledBack).toHaveBeenCalledTimes(1);
      expect(connection.released).toEqual([{ session: 1, discarded: false }]);
    });

    it('discards the connection when the rollback itself fails', async () => {
      const { connection, database } = setup();
      connection.failOn = (sql) =>
        sql.endsWith('ROLLBACK') ? new Error('gone') : undefined;
      await expect(
        database.runInTransaction(async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
      expect(connection.released).toEqual([{ session: 1, discarded: true }]);
    });

    it('runs commit hooks after the commit, outside the transaction, and reports their errors', async () => {
      const { connection, database, hookErrors } = setup();
      const seen: string[] = [];
      const hookFailure = new Error('publish failed');
      await database.runInTransaction(async (uow) => {
        uow.afterCommit(() => {
          seen.push(
            `first:${connection.sql().at(-1)}:${String(database.isInTransaction())}`,
          );
        });
        uow.afterCommit(() => {
          throw hookFailure;
        });
        uow.afterCommit(async () => {
          seen.push('third');
        });
      });
      expect(seen).toEqual(['first:COMMIT:false', 'third']);
      expect(hookErrors).toEqual([hookFailure]);
    });

    it('treats a failed commit as a rollback', async () => {
      const { connection, database } = setup();
      connection.failOn = (sql) =>
        sql.endsWith('COMMIT')
          ? Object.assign(new Error('serialization'), { code: '40001' })
          : undefined;
      const rolledBack = jest.fn();
      const committed = jest.fn();
      const error = await database
        .runInTransaction(async (uow) => {
          uow.afterRollback(rolledBack);
          uow.afterCommit(committed);
        })
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(PersistenceError);
      expect(error).toMatchObject({
        code: PlatformErrorCode.PersistenceQueryFailed,
        failureKind: FailureKind.Transient,
        retryable: true,
        details: { sqlState: '40001' },
      });
      expect(rolledBack).toHaveBeenCalled();
      expect(committed).not.toHaveBeenCalled();
      expect(connection.released).toEqual([{ session: 1, discarded: true }]);
    });

    it('joins the open transaction of the same database', async () => {
      const { connection, database } = setup();
      await database.runInTransaction(async (outer) => {
        await database.runInTransaction(async (inner) => {
          expect(inner).toBe(outer);
          await inner.session.query('SELECT 2');
        });
      });
      expect(connection.sql().filter((sql) => sql === 'BEGIN')).toHaveLength(1);
      expect(new Set(connection.statements.map((s) => s.session)).size).toBe(1);
    });

    it('exposes the unit of work through current and currentUnitOfWork only inside', async () => {
      const { database } = setup();
      expect(database.current()).toBeUndefined();
      await database.runInTransaction(async (uow) => {
        expect(database.current()).toBe(uow);
        expect(currentUnitOfWork()).toBe(uow);
        expect(database.isInTransaction()).toBe(true);
      });
      expect(database.isInTransaction()).toBe(false);
      expect(currentUnitOfWork()).toBeUndefined();
    });

    it('runs afterCommit right away outside a transaction', async () => {
      const { database } = setup();
      const hook = jest.fn();
      database.afterCommit(hook);
      await Promise.resolve();
      expect(hook).toHaveBeenCalledTimes(1);
    });

    it('wraps a failure to acquire a connection', async () => {
      const { connection, database } = setup();
      connection.acquireError = Object.assign(new Error('refused'), {
        code: 'ECONNREFUSED',
      });
      await expect(
        database.runInTransaction(async () => undefined),
      ).rejects.toMatchObject({
        code: PlatformErrorCode.PersistenceQueryFailed,
        failureKind: FailureKind.Transient,
      });
    });
  });

  describe('shard guard', () => {
    it('throws CROSS_SHARD_TX when another shard is touched inside a transaction', async () => {
      const a = setup({ name: 'shard-a' });
      const b = setup({ name: 'shard-b' });
      const error = await a.database
        .runInTransaction(async () => {
          await b.database.read(async (session) => session.query('SELECT 1'));
        })
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ShardingError);
      expect((error as ShardingError).code).toBe(
        ShardingErrorCode.CrossShardTransaction,
      );
      expect(b.connection.statements).toEqual([]);
    });

    it('opens a fresh guard per transaction: sequential and parallel transactions on different shards work', async () => {
      const a = setup({ name: 'shard-a' });
      const b = setup({ name: 'shard-b' });
      await a.database.runInTransaction(async () => undefined);
      await b.database.runInTransaction(async () => undefined);
      await Promise.all([
        a.database.runInTransaction(async () => undefined),
        b.database.runInTransaction(async () => undefined),
      ]);
      expect(a.connection.sql().filter((sql) => sql === 'COMMIT')).toHaveLength(
        2,
      );
      expect(b.connection.sql().filter((sql) => sql === 'COMMIT')).toHaveLength(
        2,
      );
    });

    it('runs one guard per transaction: a joined call keeps the guard of the open one', async () => {
      const { database } = setup();
      const guards: (TransactionShardGuard | undefined)[] = [];
      await database.runInTransaction(async () => {
        guards.push(TransactionShardGuard.current());
        await database.runInTransaction(async () => {
          guards.push(TransactionShardGuard.current());
        });
      });
      await database.runInTransaction(async () => {
        guards.push(TransactionShardGuard.current());
      });
      expect(guards[0]).toBeDefined();
      expect(guards[1]).toBe(guards[0]);
      expect(guards[2]).toBeDefined();
      expect(guards[2]).not.toBe(guards[0]);
    });

    it('gives parallel transactions their own guard', async () => {
      const a = setup({ name: 'shard-a' });
      const b = setup({ name: 'shard-b' });
      const seen = await Promise.all([
        a.database.runInTransaction(async () =>
          TransactionShardGuard.current(),
        ),
        b.database.runInTransaction(async () =>
          TransactionShardGuard.current(),
        ),
      ]);
      expect(seen[0]).not.toBe(seen[1]);
    });

    it('has no guard outside a transaction and one inside it', async () => {
      const { database } = setup();
      expect(TransactionShardGuard.current()).toBeUndefined();
      await database.runInTransaction(async () => {
        expect(TransactionShardGuard.current()).toBeDefined();
      });
    });

    it('lets a global database (the catalog) run inside a shard transaction', async () => {
      const shard = setup({ name: 'shard-a' });
      const catalog = setup({ name: 'catalog', global: true });
      await shard.database.runInTransaction(async () => {
        await catalog.database.read((session) => session.query('SELECT 1'));
        await catalog.database.runInTransaction(async () => {
          await shard.database.read((session) => session.query('SELECT 2'));
        });
      });
      expect(catalog.connection.sql()).toContain('SELECT 1');
      expect(shard.connection.sql()).toContain('SELECT 2');
      expect(
        new Set(shard.connection.statements.map((s) => s.session)).size,
      ).toBe(1);
    });
  });

  describe('reads', () => {
    it('reads from the replica outside a transaction', async () => {
      const { connection, database } = setup();
      await database.read((session) => session.query('SELECT 1'));
      expect(connection.statements[0].role).toBe(DatabaseRole.Replica);
    });

    it('keeps reading the replica after a write, unless asked for the primary', async () => {
      const { connection, database } = setup();
      await database.write((session) => session.query('UPDATE t SET x = 1'));
      await database.read((session) => session.query('SELECT 1'));
      await database.readPrimary((session) => session.query('SELECT 2'));
      const role = (sql: string) =>
        connection.statements.find((s) => s.sql.endsWith(sql))?.role;
      expect(role('SELECT 1')).toBe(DatabaseRole.Replica);
      expect(role('SELECT 2')).toBe(DatabaseRole.Primary);
    });

    it('uses the transaction session for reads inside it', async () => {
      const { connection, database } = setup();
      await database.runInTransaction(async () => {
        await database.read((session) => session.query('SELECT 1'));
      });
      expect(new Set(connection.statements.map((s) => s.session)).size).toBe(1);
    });

    it('releases a read session with the error when the query fails', async () => {
      const { connection, database } = setup();
      connection.failOn = () =>
        Object.assign(new Error('syntax'), { code: '42601' });
      const error = await database
        .read((session) => session.query('SELEC 1'))
        .catch((caught: unknown) => caught);
      expect(error).toMatchObject({
        code: PlatformErrorCode.PersistenceQueryFailed,
        failureKind: FailureKind.Permanent,
        details: { sqlState: '42601' },
      });
      expect((error as Error).message).not.toContain('syntax');
      expect(connection.released).toEqual([{ session: 1, discarded: true }]);
    });
  });

  it('validates its options', () => {
    const connection = new RecordingConnection();
    expect(() => new Database({ name: '', connection })).toThrow(
      PersistenceError,
    );
  });

  describe('closing', () => {
    it('closes when idle only after the last borrowed session returns', async () => {
      const { connection, database } = setup();
      let finish: () => void = () => undefined;
      const running = database.runInTransaction(
        () => new Promise<void>((resolve) => (finish = resolve)),
      );
      await Promise.resolve();
      await new Promise((resolve) => setImmediate(resolve));
      let closed = false;
      const closing = database.closeWhenIdle().then(() => {
        closed = true;
      });
      await new Promise((resolve) => setImmediate(resolve));
      expect(closed).toBe(false);
      expect(connection.closed).toBe(false);
      finish();
      await running;
      await closing;
      expect(closed).toBe(true);
      expect(connection.closed).toBe(true);
    });

    it('closes at once when nothing is borrowed', async () => {
      const { connection, database } = setup();
      await database.closeWhenIdle();
      expect(connection.closed).toBe(true);
    });
  });
});
