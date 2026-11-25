import type { TransactionHook, UnitOfWork } from '@platform/kernel';

/** Unit of work that does nothing; enough for tests that only count openings. */
export class NoopUnitOfWork implements UnitOfWork {
  readonly database = 'test';

  afterCommit(hook: TransactionHook): void {
    void hook;
  }

  afterRollback(hook: TransactionHook): void {
    void hook;
  }
}
