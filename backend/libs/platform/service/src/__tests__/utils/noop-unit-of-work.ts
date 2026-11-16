import type { TransactionHook, UnitOfWork } from '@platform/kernel';

/** Unidad de trabajo que no hace nada; basta para las pruebas que solo cuentan aperturas. */
export class NoopUnitOfWork implements UnitOfWork {
  readonly database = 'test';

  afterCommit(hook: TransactionHook): void {
    void hook;
  }

  afterRollback(hook: TransactionHook): void {
    void hook;
  }
}
