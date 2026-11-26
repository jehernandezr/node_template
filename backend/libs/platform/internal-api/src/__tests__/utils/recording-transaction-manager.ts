import {
  TransactionManager,
  type TransactionHook,
  type UnitOfWork,
} from '@platform/kernel';

/**
 * Test `TransactionManager` that counts how many units of work were
 * committed and how many were rolled back. The counters are public because
 * that count is what the tests verify.
 */
export class RecordingTransactionManager extends TransactionManager {
  commits = 0;
  rollbacks = 0;
  private open = false;

  override async runInTransaction<T>(
    fn: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
    this.open = true;
    try {
      const result = await fn({
        database: 'test',
        afterCommit: () => undefined,
        afterRollback: () => undefined,
      });
      this.commits += 1;
      return result;
    } catch (error) {
      this.rollbacks += 1;
      throw error;
    } finally {
      this.open = false;
    }
  }

  override current(): UnitOfWork | undefined {
    return undefined;
  }

  override isInTransaction(): boolean {
    return this.open;
  }

  override afterCommit(hook: TransactionHook): void {
    void hook;
  }
}
