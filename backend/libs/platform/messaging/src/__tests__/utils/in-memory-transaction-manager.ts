import { AsyncLocalStorage } from 'node:async_hooks';
import {
  type TransactionHook,
  TransactionManager,
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
 * Transacciones en memoria con el contexto asíncrono real: una transacción
 * anidada se une a la abierta y los efectos corren solo tras commit o rollback.
 */
export class InMemoryTransactionManager extends TransactionManager {
  private readonly storage = new AsyncLocalStorage<InMemoryUnitOfWork>();

  async runInTransaction<T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    const open = this.storage.getStore();
    if (open) return fn(open);

    const uow = new InMemoryUnitOfWork();
    let result: T;
    try {
      result = await this.storage.run(uow, () => fn(uow));
    } catch (err) {
      for (const hook of uow.rollbackHooks) await hook();
      throw err;
    }
    for (const hook of uow.commitHooks) await hook();
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
    if (uow) uow.afterCommit(hook);
    else void hook();
  }
}
