import { AsyncLocalStorage } from 'node:async_hooks';
import {
  TransactionManager,
  type TransactionHook,
  type UnitOfWork,
} from '@platform/kernel';

/** Unidad de trabajo en memoria: guarda los efectos hasta el commit o el rollback. */
class InMemoryUnitOfWork implements UnitOfWork {
  readonly database = 'default';
  readonly commitHooks: TransactionHook[] = [];
  readonly rollbackHooks: TransactionHook[] = [];

  afterCommit(hook: TransactionHook): void {
    this.commitHooks.push(hook);
  }

  afterRollback(hook: TransactionHook): void {
    this.rollbackHooks.push(hook);
  }
}

/**
 * Transacciones en memoria con contexto asíncrono real: una transacción
 * anidada se une a la abierta y los efectos de `afterCommit` corren solo tras
 * el commit, fuera de la transacción, como en `TypeOrmTransactionManager`.
 * Los contadores son públicos porque es lo que las pruebas verifican.
 */
export class InMemoryTransactionManager extends TransactionManager {
  commits = 0;
  rollbacks = 0;
  private readonly storage = new AsyncLocalStorage<InMemoryUnitOfWork>();

  async runInTransaction<T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    const open = this.storage.getStore();
    if (open !== undefined) {
      return fn(open);
    }
    const uow = new InMemoryUnitOfWork();
    let result: T;
    try {
      result = await this.storage.run(uow, () => fn(uow));
    } catch (error) {
      this.rollbacks += 1;
      for (const hook of uow.rollbackHooks) {
        await hook();
      }
      throw error;
    }
    this.commits += 1;
    for (const hook of uow.commitHooks) {
      await hook();
    }
    return result;
  }

  current(): UnitOfWork | undefined {
    return this.storage.getStore();
  }

  isInTransaction(): boolean {
    return this.current() !== undefined;
  }

  afterCommit(hook: TransactionHook): void {
    const uow = this.storage.getStore();
    if (uow !== undefined) {
      uow.afterCommit(hook);
      return;
    }
    void hook();
  }
}
