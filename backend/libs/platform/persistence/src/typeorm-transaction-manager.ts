import { AsyncLocalStorage } from 'node:async_hooks';
import { TransactionManager, type TransactionHook } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import { ShardAccess, TransactionShardGuard } from '@platform/sharding';
import type { QueryRunner } from 'typeorm';
import type { PersistenceContextProvider } from './context/persistence-context-provider.js';
import { toPersistenceError } from './errors.js';
import { SessionSetting } from './enums.js';
import type { ShardHandle } from './model/shard-handle.js';
import type { ShardedTransactionOptions } from './model/sharded-transaction-options.js';
import type { PersistenceFeature } from './persistence-feature.js';
import type { ShardResolver } from './shard-resolver.js';
import { TypeOrmUnitOfWork } from './typeorm-unit-of-work.js';

/**
 * Implementa el puerto `TransactionManager` del kernel con un `QueryRunner` del shard resuelto.
 * Una transacción vive en un solo shard: cada una abre su `TransactionShardGuard` de `@platform/sharding`.
 */
export class TypeOrmTransactionManager extends TransactionManager<TypeOrmUnitOfWork> {
  private static readonly COMMIT_HOOK_FAILED =
    'Transaction afterCommit hook failed';
  private static readonly ROLLBACK_HOOK_FAILED =
    'Transaction afterRollback hook failed';

  private readonly storage = new AsyncLocalStorage<TypeOrmUnitOfWork>();

  constructor(
    private readonly resolver: ShardResolver,
    private readonly defaultFeature: PersistenceFeature,
    private readonly context: PersistenceContextProvider,
    private readonly logger: LoggerPort,
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
      // Se une a la transacción abierta: las opciones de la externa mandan.
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
    // Sin transacción no hay nada que esperar: el efecto corre de inmediato y sin bloquear.
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
    let active = false;
    let uow: TypeOrmUnitOfWork | undefined;
    let hooks: readonly TransactionHook[] = [];
    let result: T;
    try {
      try {
        await qr.connect();
        await qr.startTransaction(options?.isolation);
        active = true;
        await this.applySession(qr, options);
      } catch (error) {
        throw toPersistenceError(error);
      }
      uow = new TypeOrmUnitOfWork(shard, qr.manager, qr);
      const opened = uow;
      result = await this.storage.run(opened, () => fn(opened));
      try {
        await qr.commitTransaction();
      } catch (error) {
        throw toPersistenceError(error);
      }
      active = false;
      hooks = opened.takeCommitHooks();
    } catch (error) {
      if (active) {
        try {
          await qr.rollbackTransaction();
        } catch {
          // El error original es el que importa al llamador.
        }
        hooks = uow?.takeRollbackHooks() ?? [];
      }
      await qr.release();
      await this.runHooks(
        hooks,
        TypeOrmTransactionManager.ROLLBACK_HOOK_FAILED,
      );
      throw error;
    }
    await qr.release();
    await this.runHooks(hooks, TypeOrmTransactionManager.COMMIT_HOOK_FAILED);
    return result;
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

  /** Corre los efectos en orden. Un efecto que falla se reporta y no cambia el resultado. */
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
