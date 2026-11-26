import type { TransactionHook, UnitOfWork } from '@platform/kernel';
import type { EntityManager, QueryRunner } from 'typeorm';

/** A transaction open on a shard: its `QueryRunner`, its `EntityManager` and the pending effects. */
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

  /**
   * Returns and clears the after-commit effects, in registration order.
   * @returns The hooks.
   */
  takeCommitHooks(): readonly TransactionHook[] {
    return this.commitHooks.splice(0);
  }

  /**
   * Returns and clears the after-rollback effects, in registration order.
   * @returns The hooks.
   */
  takeRollbackHooks(): readonly TransactionHook[] {
    return this.rollbackHooks.splice(0);
  }
}
