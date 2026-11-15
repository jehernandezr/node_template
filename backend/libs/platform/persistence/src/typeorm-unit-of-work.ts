import type { TransactionHook, UnitOfWork } from '@platform/kernel';
import type { EntityManager, QueryRunner } from 'typeorm';

/** Una transacción abierta sobre un shard: su `QueryRunner`, su `EntityManager` y los efectos pendientes. */
export class TypeOrmUnitOfWork implements UnitOfWork {
  private readonly commitHooks: TransactionHook[] = [];
  private readonly rollbackHooks: TransactionHook[] = [];

  constructor(
    readonly database: string,
    readonly manager: EntityManager,
    readonly queryRunner: QueryRunner,
  ) {}

  afterCommit(hook: TransactionHook): void {
    this.commitHooks.push(hook);
  }

  afterRollback(hook: TransactionHook): void {
    this.rollbackHooks.push(hook);
  }

  /** Entrega y vacía los efectos de después del commit, en orden de registro. */
  takeCommitHooks(): readonly TransactionHook[] {
    return this.commitHooks.splice(0);
  }

  /** Entrega y vacía los efectos de después del rollback, en orden de registro. */
  takeRollbackHooks(): readonly TransactionHook[] {
    return this.rollbackHooks.splice(0);
  }
}
