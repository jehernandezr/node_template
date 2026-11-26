import { AsyncLocalStorage } from 'node:async_hooks';
import {
  TransactionManager,
  type TransactionHook,
  type UnitOfWork,
} from '@platform/kernel';

/** In-memory unit of work: holds the effects until commit or rollback. */
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
 * In-memory transactions with a real async context: a nested transaction
 * joins the open one and the `afterCommit` effects run only after
 * the commit, outside the transaction, as in `TypeOrmTransactionManager`.
 * The counters are public because they are what the tests verify.
 */
export class InMemoryTransactionManager extends TransactionManager {
  commits = 0;
  rollbacks = 0;
  private readonly storage = new AsyncLocalStorage<InMemoryUnitOfWork>();

  override async runInTransaction<T>(
    fn: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
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

  override current(): UnitOfWork | undefined {
    return this.storage.getStore();
  }

  override isInTransaction(): boolean {
    return this.current() !== undefined;
  }

  override afterCommit(hook: TransactionHook): void {
    const uow = this.storage.getStore();
    if (uow !== undefined) {
      uow.afterCommit(hook);
      return;
    }
    void hook();
  }
}
