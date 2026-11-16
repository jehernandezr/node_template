import {
  TransactionManager,
  type TransactionHook,
  type UnitOfWork,
} from '@platform/kernel';

/**
 * `TransactionManager` de pruebas que cuenta cuántas unidades de trabajo se
 * confirmaron y cuántas se deshicieron. Los contadores son públicos porque
 * ese conteo es lo que las pruebas verifican.
 */
export class RecordingTransactionManager extends TransactionManager {
  commits = 0;
  rollbacks = 0;
  private open = false;

  async runInTransaction<T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T> {
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

  current(): UnitOfWork | undefined {
    return undefined;
  }

  isInTransaction(): boolean {
    return this.open;
  }

  afterCommit(hook: TransactionHook): void {
    void hook;
  }
}
