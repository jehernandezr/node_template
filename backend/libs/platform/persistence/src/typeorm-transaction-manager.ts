import { AsyncLocalStorage } from 'node:async_hooks';
import { TransactionManager, type TransactionHook } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import { ShardAccess, TransactionShardGuard } from '@platform/sharding';
import type { QueryRunner } from 'typeorm';
import type { PersistenceContextProvider } from './context/persistence-context-provider.js';
import { PersistenceErrorTranslator } from './errors/persistence-error-translator.js';
import { SessionSetting } from './enums.js';
import type { ShardHandle } from './model/shard-handle.js';
import type { ShardedTransactionOptions } from './model/sharded-transaction-options.js';
import type { PersistenceFeature } from './persistence-feature.js';
import type { ShardResolver } from './shard-resolver.js';
import type { TenantWriteFence } from './tenant-write-fence.js';
import { TypeOrmUnitOfWork } from './typeorm-unit-of-work.js';

/**
 * Implements the kernel `TransactionManager` port with a `QueryRunner` of the resolved shard.
 * A transaction lives on a single shard: each one opens its `TransactionShardGuard` from `@platform/sharding`.
 */
export class TypeOrmTransactionManager extends TransactionManager<TypeOrmUnitOfWork> {
  private static readonly COMMIT_HOOK_FAILED =
    'Transaction afterCommit hook failed';
  private static readonly ROLLBACK_HOOK_FAILED =
    'Transaction afterRollback hook failed';
  private static readonly FENCE_RELEASE_FAILED =
    'Tenant write fence lock release failed';

  private readonly storage = new AsyncLocalStorage<TypeOrmUnitOfWork>();

  /**
   * @param fence Tenant relocation barrier. Without it writes do not check it, as in databases that do not
   *   have `tenant_write_fences`.
   */
  constructor(
    private readonly resolver: ShardResolver,
    private readonly defaultFeature: PersistenceFeature,
    private readonly context: PersistenceContextProvider,
    private readonly logger: LoggerPort,
    private readonly fence?: TenantWriteFence,
  ) {
    super();
  }

  async runInTransaction<T>(
    fn: (uow: TypeOrmUnitOfWork) => Promise<T>,
    options?: ShardedTransactionOptions,
  ): Promise<T> {
    const handle = await this.resolver.resolve({
      feature: options?.feature ?? this.defaultFeature,
      source: options?.source,
      access: options?.readOnly === true ? ShardAccess.Read : ShardAccess.Write,
    });
    const shard = handle.resolved.logicalShard;
    const existing = this.current();
    if (existing !== undefined) {
      // Joins the open transaction: the outer one's options take precedence.
      TransactionShardGuard.current()?.touch(shard);
      return fn(existing);
    }
    return TransactionShardGuard.run(() => this.runNew(handle, fn, options));
  }

  current(): TypeOrmUnitOfWork | undefined {
    return this.storage.getStore();
  }

  isInTransaction(): boolean {
    return this.current() !== undefined;
  }

  afterCommit(hook: TransactionHook): void {
    const uow = this.current();
    if (uow !== undefined) {
      uow.afterCommit(hook);
      return;
    }
    // Without a transaction there is nothing to wait for: the effect runs immediately and without blocking.
    try {
      void Promise.resolve(hook()).catch((error: unknown) => {
        this.logHookFailure(
          TypeOrmTransactionManager.COMMIT_HOOK_FAILED,
          error,
        );
      });
    } catch (error) {
      this.logHookFailure(TypeOrmTransactionManager.COMMIT_HOOK_FAILED, error);
    }
  }

  private async runNew<T>(
    handle: ShardHandle,
    fn: (uow: TypeOrmUnitOfWork) => Promise<T>,
    options?: ShardedTransactionOptions,
  ): Promise<T> {
    const shard = handle.resolved.logicalShard;
    TransactionShardGuard.current()?.touch(shard);
    const qr = handle.dataSource.createQueryRunner('master');
    const fencedTenant =
      this.fence !== undefined && options?.readOnly !== true
        ? handle.resolved.tenantId
        : undefined;
    let admitted = false;
    let active = false;
    let uow: TypeOrmUnitOfWork | undefined;
    let hooks: readonly TransactionHook[] = [];
    let result: T;
    try {
      try {
        await qr.connect();
        if (fencedTenant !== undefined) {
          await this.fence?.admit(qr, fencedTenant);
          admitted = true;
        }
        await qr.startTransaction(options?.isolation);
        active = true;
        await this.applySession(qr, options);
      } catch (error) {
        throw PersistenceErrorTranslator.toPersistenceError(error);
      }
      uow = new TypeOrmUnitOfWork(shard, qr.manager, qr);
      const opened = uow;
      result = await this.storage.run(opened, () => fn(opened));
      try {
        await qr.commitTransaction();
      } catch (error) {
        throw PersistenceErrorTranslator.toPersistenceError(error);
      }
      active = false;
      hooks = opened.takeCommitHooks();
    } catch (error) {
      if (active) {
        try {
          await qr.rollbackTransaction();
        } catch {
          // The original error is the one that matters to the caller.
        }
        hooks = uow?.takeRollbackHooks() ?? [];
      }
      await this.release(qr, admitted ? fencedTenant : undefined);
      await this.runHooks(
        hooks,
        TypeOrmTransactionManager.ROLLBACK_HOOK_FAILED,
      );
      throw error;
    }
    await this.release(qr, fencedTenant);
    await this.runHooks(hooks, TypeOrmTransactionManager.COMMIT_HOOK_FAILED);
    return result;
  }

  /**
   * Releases the barrier lock and returns the connection to the pool. If the lock is not released, closes the connection
   * before returning it, so the pool discards it and Postgres releases the lock when the session closes: if it went back to the
   * pool with the lock held, the tenant relocation would wait forever. The transaction result does not
   * change.
   */
  private async release(
    qr: QueryRunner,
    tenantId: string | undefined,
  ): Promise<void> {
    if (tenantId !== undefined && this.fence !== undefined) {
      try {
        await this.fence.leave(qr, tenantId);
      } catch (error) {
        this.logger.error(TypeOrmTransactionManager.FENCE_RELEASE_FAILED, {
          error: error instanceof Error ? error.message : String(error),
        });
        await this.close(qr);
      }
    }
    await qr.release();
  }

  /** Closes the connection session; an already dropped connection has nothing to close. */
  private async close(qr: QueryRunner): Promise<void> {
    const connection: { end(): Promise<void> } = await qr.connect();
    try {
      await connection.end();
    } catch (error) {
      this.logger.error(TypeOrmTransactionManager.FENCE_RELEASE_FAILED, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async applySession(
    qr: QueryRunner,
    options?: ShardedTransactionOptions,
  ): Promise<void> {
    const ctx = this.context.current();
    const settings: readonly (readonly [SessionSetting, string])[] = [
      [SessionSetting.ActorId, ctx.actorId ?? ''],
      [SessionSetting.ActorType, ctx.actorType ?? ''],
      [SessionSetting.TenantId, ctx.tenantId ?? ''],
      [SessionSetting.TraceId, ctx.traceId ?? ''],
    ];
    for (const [name, value] of settings) {
      await qr.query('SELECT set_config($1, $2, true)', [name, value]);
    }
    if (options?.readOnly === true) {
      await qr.query('SET TRANSACTION READ ONLY');
    }
    if (options?.statementTimeoutMs !== undefined) {
      await qr.query("SELECT set_config('statement_timeout', $1, true)", [
        String(options.statementTimeoutMs),
      ]);
    }
  }

  /** Runs the effects in order. A failing effect is reported and does not change the result. */
  private async runHooks(
    hooks: readonly TransactionHook[],
    message: string,
  ): Promise<void> {
    for (const hook of hooks) {
      try {
        await hook();
      } catch (error) {
        this.logHookFailure(message, error);
      }
    }
  }

  private logHookFailure(message: string, error: unknown): void {
    this.logger.error(message, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
