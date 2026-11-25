import {
  TransactionManager,
  type TransactionHook,
  type UnitOfWork,
} from '@platform/kernel';
import { NoopUnitOfWork } from './noop-unit-of-work.js';

/** Transactions without a database: counts how many times they were opened and runs `fn` immediately. */
export class CountingTransactionManager extends TransactionManager {
  private opened = 0;

  get openedCount(): number {
    return this.opened;
  }

  override runInTransaction<T>(
    fn: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
    this.opened += 1;
    return fn(new NoopUnitOfWork());
  }

  override current(): UnitOfWork | undefined {
    return undefined;
  }

  override isInTransaction(): boolean {
    return false;
  }

  override afterCommit(hook: TransactionHook): void {
    void hook();
  }
}
