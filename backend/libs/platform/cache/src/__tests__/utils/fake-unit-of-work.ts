import type { TransactionHook, UnitOfWork } from '@platform/kernel';

/** Unidad de trabajo de prueba: guarda sus hooks y los corre al cerrar la transacción. */
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

  /** Corre los hooks de commit en orden, esperando cada uno. Un hook que falla no detiene a los demás. */
  async commit(): Promise<void> {
    await this.runAll(this.commitHooks);
  }

  /** Corre los hooks de rollback en orden. */
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
