import type { DataSource, QueryRunner, ReplicationMode } from 'typeorm';
import { IsolationLevel } from '@platform/kernel';
import { PlatformErrorCode } from '@contracts/platform';
import { ShardKey, ShardingErrorCode } from '@platform/sharding';
import { DataSourceFactory } from '../ports/data-source-factory.js';
import type { DatabaseTarget } from '../model/database-target.js';
import { PersistenceFeature } from '../persistence-feature.js';
import { ShardDataSources } from '../shard-data-sources.js';
import { ShardResolver } from '../shard-resolver.js';
import { TypeOrmTransactionManager } from '../typeorm-transaction-manager.js';
import { StubDataSource } from './utils/stub-data-source.js';
import { StubQueryRunner } from './utils/stub-query-runner.js';
import { StubShardedLayer } from './utils/stub-sharded-layer.js';

const TENANT_A = StubShardedLayer.TENANT_A;
const TENANT_B = StubShardedLayer.TENANT_B;
const SHARD_A = StubShardedLayer.SHARD_A;
const SHARD_B = StubShardedLayer.SHARD_B;
const TRACE_ID = '0193f1c2000070008000000000000001';

/** `DataSource` que hace fallar el commit de cada runner que crea. */
class CommitFailingDataSource extends StubDataSource {
  override createQueryRunner(mode: ReplicationMode = 'master'): QueryRunner {
    const runner = super.createQueryRunner(mode);
    if (runner instanceof StubQueryRunner) {
      runner.failOnCommit = true;
    }
    return runner;
  }
}

class CommitFailingFactory extends DataSourceFactory {
  readonly created: CommitFailingDataSource[] = [];

  create(target: DatabaseTarget): DataSource {
    const dataSource = new CommitFailingDataSource(target.database);
    this.created.push(dataSource);
    return dataSource;
  }
}

/** Las cuatro variables de sesión que la capa fija al abrir cada transacción del contexto de `asTenant`. */
function sessionCalls(tenantId: string): string[] {
  return [
    `query SELECT set_config($1, $2, true) ${JSON.stringify(['app.actor_id', 'stub-actor'])}`,
    `query SELECT set_config($1, $2, true) ${JSON.stringify(['app.actor_type', 'user'])}`,
    `query SELECT set_config($1, $2, true) ${JSON.stringify(['app.tenant_id', tenantId])}`,
    `query SELECT set_config($1, $2, true) ${JSON.stringify(['app.trace_id', TRACE_ID])}`,
  ];
}

function runnerCallsOf(
  layer: StubShardedLayer,
  shard: string,
): readonly string[] {
  return layer.dataSource(shard).runners[0].calls;
}

describe('TypeOrmTransactionManager', () => {
  let layer: StubShardedLayer;

  beforeEach(() => {
    layer = new StubShardedLayer();
    layer.asTenant(TENANT_A);
  });

  describe('when a transaction completes', () => {
    it('opens, sets the session, commits and releases, in that order', async () => {
      const result = await layer.transactions.runInTransaction(() =>
        Promise.resolve('done'),
      );

      expect(result).toBe('done');
      expect(runnerCallsOf(layer, SHARD_A)).toEqual([
        'connect',
        'begin',
        ...sessionCalls(TENANT_A),
        'commit',
        'release',
      ]);
    });
  });

  describe('when the body throws', () => {
    it('rolls back, releases and rethrows the same error object', async () => {
      const error = new Error('body failed');

      await expect(
        layer.transactions.runInTransaction(() => Promise.reject(error)),
      ).rejects.toBe(error);

      expect(runnerCallsOf(layer, SHARD_A)).toEqual([
        'connect',
        'begin',
        ...sessionCalls(TENANT_A),
        'rollback',
        'release',
      ]);
    });
  });

  describe('when the commit fails', () => {
    it('reports a QueryFailed persistence error and rolls back', async () => {
      const factory = new CommitFailingFactory();
      const sources = new ShardDataSources(
        factory,
        layer.endpoints,
        layer.clock,
        {
          idleTtlMs: 60_000,
        },
      );
      const resolver = new ShardResolver(
        layer.router,
        sources,
        layer.scope,
        layer.context,
        {
          requireScope: false,
        },
      );
      const transactions = new TypeOrmTransactionManager(
        resolver,
        new PersistenceFeature({ key: ShardKey.Tenant }),
        layer.context,
        layer.logger,
      );

      await expect(
        transactions.runInTransaction(() => Promise.resolve('never returned')),
      ).rejects.toMatchObject({
        code: PlatformErrorCode.PersistenceQueryFailed,
      });

      expect(factory.created[0].runners[0].calls).toEqual([
        'connect',
        'begin',
        ...sessionCalls(TENANT_A),
        'commit',
        'rollback',
        'release',
      ]);
    });
  });

  describe('with commit and rollback hooks', () => {
    it('runs afterCommit hooks only after a commit', async () => {
      const events: string[] = [];

      await layer.transactions.runInTransaction(() => {
        layer.transactions.afterCommit(() => {
          events.push('commit');
        });
        layer.transactions.afterCommit(() => {
          events.push('commit again');
        });
        events.push('body');
        return Promise.resolve();
      });

      expect(events).toEqual(['body', 'commit', 'commit again']);
    });

    it('runs afterRollback hooks only after a rollback', async () => {
      const events: string[] = [];

      await expect(
        layer.transactions.runInTransaction(async (uow) => {
          uow.afterCommit(() => {
            events.push('commit');
          });
          uow.afterRollback(() => {
            events.push('rollback');
          });
          throw new Error('body failed');
        }),
      ).rejects.toThrow('body failed');

      expect(events).toEqual(['rollback']);
    });
  });

  describe('when a commit hook throws', () => {
    it('logs the failure and still returns the result', async () => {
      const result = await layer.transactions.runInTransaction((uow) => {
        uow.afterCommit(() => {
          throw new Error('hook boom');
        });
        return Promise.resolve('kept');
      });

      expect(result).toBe('kept');
      expect(layer.logger.errors).toEqual([
        {
          message: 'Transaction afterCommit hook failed',
          fields: { error: 'hook boom' },
        },
      ]);
    });
  });

  describe('when afterCommit runs outside a transaction', () => {
    it('runs the hook immediately', () => {
      const events: string[] = [];

      layer.transactions.afterCommit(() => {
        events.push('now');
      });

      expect(events).toEqual(['now']);
    });

    it('logs a synchronous failure of the hook', () => {
      layer.transactions.afterCommit(() => {
        throw new Error('late boom');
      });

      expect(layer.logger.errors).toEqual([
        {
          message: 'Transaction afterCommit hook failed',
          fields: { error: 'late boom' },
        },
      ]);
    });

    it('logs a rejected promise returned by the hook', async () => {
      layer.transactions.afterCommit(() =>
        Promise.reject(new Error('async boom')),
      );
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(layer.logger.errors).toEqual([
        {
          message: 'Transaction afterCommit hook failed',
          fields: { error: 'async boom' },
        },
      ]);
    });
  });

  describe('when a transaction is nested in another one', () => {
    it('gives both bodies the same unit of work and opens one transaction', async () => {
      const seen: unknown[] = [];

      await layer.transactions.runInTransaction(async (outer) => {
        seen.push(outer);
        await layer.transactions.runInTransaction((inner) => {
          seen.push(inner);
          return Promise.resolve();
        });
      });

      expect(seen[1]).toBe(seen[0]);
      expect(layer.dataSource(SHARD_A).runners).toHaveLength(1);
      expect(runnerCallsOf(layer, SHARD_A)).toEqual([
        'connect',
        'begin',
        ...sessionCalls(TENANT_A),
        'commit',
        'release',
      ]);
    });
  });

  describe('when a nested transaction runs inside a scope of another shard', () => {
    it('rejects with CROSS_SHARD_TX', async () => {
      await expect(
        layer.transactions.runInTransaction(() =>
          layer.scope.run(
            { tenantId: TENANT_B, keyKind: ShardKey.Tenant },
            () =>
              layer.transactions.runInTransaction(() => Promise.resolve('x')),
          ),
        ),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.CrossShardTransaction,
      });
    });
  });

  describe('when two transactions run in parallel under different scopes', () => {
    it('keeps each one on its own shard', async () => {
      const [databaseA, databaseB] = await Promise.all([
        layer.scope.run({ tenantId: TENANT_A, keyKind: ShardKey.Tenant }, () =>
          layer.transactions.runInTransaction(async (uow) => {
            await Promise.resolve();
            return uow.database;
          }),
        ),
        layer.scope.run({ tenantId: TENANT_B, keyKind: ShardKey.Tenant }, () =>
          layer.transactions.runInTransaction(async (uow) => {
            await Promise.resolve();
            return uow.database;
          }),
        ),
      ]);

      expect([databaseA, databaseB]).toEqual([SHARD_A, SHARD_B]);
    });
  });

  describe('when the isolation level is Serializable', () => {
    it('begins with that level', async () => {
      await layer.transactions.runInTransaction(() => Promise.resolve(), {
        isolation: IsolationLevel.Serializable,
      });

      expect(runnerCallsOf(layer, SHARD_A)).toContain('begin SERIALIZABLE');
    });
  });

  describe('when the transaction is read only', () => {
    it('sets the transaction read only and routes to a read shard', async () => {
      await layer.transactions.runInTransaction(() => Promise.resolve(), {
        readOnly: true,
      });

      expect(runnerCallsOf(layer, SHARD_A)).toContain(
        'query SET TRANSACTION READ ONLY []',
      );
    });
  });

  describe('when a statement timeout is given', () => {
    it('sets the statement_timeout for the transaction', async () => {
      await layer.transactions.runInTransaction(() => Promise.resolve(), {
        statementTimeoutMs: 5_000,
      });

      expect(runnerCallsOf(layer, SHARD_A)).toContain(
        `query SELECT set_config('statement_timeout', $1, true) ${JSON.stringify(['5000'])}`,
      );
    });
  });

  describe('when the context has no tenant', () => {
    it('rejects with KEY_MISSING before opening anything', async () => {
      layer.context.set({});

      await expect(
        layer.transactions.runInTransaction(() => Promise.resolve()),
      ).rejects.toMatchObject({ code: ShardingErrorCode.KeyMissing });
      expect(layer.factory.created).toHaveLength(0);
    });
  });

  it('exposes the open unit of work only while the body runs', async () => {
    let inside: unknown;

    await layer.transactions.runInTransaction((uow) => {
      inside = layer.transactions.current();
      expect(uow.database).toBe(SHARD_A);
      return Promise.resolve();
    });

    expect(inside).toBeDefined();
    expect(layer.transactions.isInTransaction()).toBe(false);
  });
});
