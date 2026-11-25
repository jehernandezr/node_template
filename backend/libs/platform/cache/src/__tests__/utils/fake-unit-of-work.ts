import type { TransactionHook, UnitOfWork } from '@platform/kernel';

/** Test unit of work: stores its hooks and runs them when the transaction closes. */
export class FakeUnitOfWork implements UnitOfWork {
  readonly database = 'test';
  readonly hookErrors: unknown[] = [];
  private readonly commitHooks: TransactionHook[] = [];
  private readonly rollbackHooks: TransactionHook[] = [];

  afterCommit(hook: TransactionHook): void {
    this.commitHooks.push(hook);
  }

  afterRollback(hook: TransactionHook): void {
    this.rollbackHooks.push(hook);
  }

  /** Runs the commit hooks in order, awaiting each one. A failing hook does not stop the others. */
  async commit(): Promise<void> {
    await this.runAll(this.commitHooks);
  }

  /** Runs the rollback hooks in order. */
  async rollback(): Promise<void> {
    await this.runAll(this.rollbackHooks);
  }

  private async runAll(hooks: readonly TransactionHook[]): Promise<void> {
    for (const hook of hooks) {
      try {
        await hook();
      } catch (error) {
        this.hookErrors.push(error);
      }
    }
  }
}
