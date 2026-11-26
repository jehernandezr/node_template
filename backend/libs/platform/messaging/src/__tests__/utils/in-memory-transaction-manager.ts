import { AsyncLocalStorage } from 'node:async_hooks';
import {
  type TransactionHook,
  TransactionManager,
  type UnitOfWork,
} from '@platform/kernel';

/** In-memory unit of work: holds the effects until the commit or the rollback. */
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
 * In-memory transactions with the real async context: a nested
 * transaction joins the open one and effects run only after commit or rollback.
 */
export class InMemoryTransactionManager extends TransactionManager {
  private readonly storage = new AsyncLocalStorage<InMemoryUnitOfWork>();

  override async runInTransaction<T>(
    fn: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
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

  override current(): UnitOfWork | undefined {
    return this.storage.getStore();
  }

  override isInTransaction(): boolean {
    return this.current() !== undefined;
  }

  override afterCommit(hook: TransactionHook): void {
    const uow = this.storage.getStore();
    if (uow) uow.afterCommit(hook);
    else void hook();
  }
}
