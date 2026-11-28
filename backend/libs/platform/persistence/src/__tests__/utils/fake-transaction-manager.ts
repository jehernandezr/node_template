import { TransactionManager, type UnitOfWork } from '@platform/kernel';

/** Transaction manager that only reports whether one is open. */
export class FakeTransactionManager extends TransactionManager {
  /**
   * @param open What `isInTransaction` answers.
   */
  constructor(private readonly open: boolean) {
    super();
  }

  /**
   * Runs `fn` with an empty unit of work, without a transaction.
   * @param fn Work to run.
   * @returns What `fn` returns.
   */
  override runInTransaction<T>(
    fn: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
    return fn({
      database: '',
      afterCommit: () => undefined,
      afterRollback: () => undefined,
    });
  }

  /**
   * There is never a current unit of work.
   * @returns `undefined`.
   */
  override current(): undefined {
    return undefined;
  }

  /**
   * Whether a transaction is open, as given to the constructor.
   * @returns The configured answer.
   */
  override isInTransaction(): boolean {
    return this.open;
  }

  /** Ignores the callback: no transaction ever commits. */
  override afterCommit(): void {}
}
