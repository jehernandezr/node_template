import { TransactionManager, type TransactionHook } from '@platform/kernel';
import { FakeUnitOfWork } from './fake-unit-of-work.js';

/**
 * Gestor de transacciones de prueba. Una transacción abierta es una pila de
 * unidades: una llamada anidada se une a la que ya está abierta.
 */
export class FakeTransactionManager extends TransactionManager<FakeUnitOfWork> {
  private readonly open: FakeUnitOfWork[] = [];

  override async runInTransaction<T>(
    fn: (uow: FakeUnitOfWork) => Promise<T>,
  ): Promise<T> {
    const joined = this.current();
    if (joined !== undefined) {
      return fn(joined);
    }
    const unit = new FakeUnitOfWork();
    this.open.push(unit);
    let result: T;
    try {
      result = await fn(unit);
    } catch (error) {
      this.open.pop();
      await unit.rollback();
      throw error;
    }
    this.open.pop();
    await unit.commit();
    return result;
  }

  override current(): FakeUnitOfWork | undefined {
    return this.open[this.open.length - 1];
  }

  override isInTransaction(): boolean {
    return this.current() !== undefined;
  }

  override afterCommit(hook: TransactionHook): void {
    const unit = this.current();
    if (unit !== undefined) {
      unit.afterCommit(hook);
      return;
    }
    hook();
  }
}
