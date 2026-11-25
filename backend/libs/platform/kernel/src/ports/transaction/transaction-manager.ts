import type { TransactionHook } from './transaction-hook.js';
import type { TransactionOptions } from './transaction-options.js';
import type { UnitOfWork } from './unit-of-work.js';

/**
 * Transaction port (Unit of Work). Used by the use cases, the internal
 * router (saving the result with the effects) and the message bus (the
 * outbox in the same transaction).
 *
 * - `runInTransaction(fn)` opens a transaction, or joins the one already
 *   open on the same database (the options of the outer one win).
 * - If `fn` throws, the transaction is rolled back and the error propagates as is.
 * - `afterCommit` outside a transaction runs the effect immediately, because
 *   there is nothing to wait for.
 *
 * All its members are public and abstract, so an object literal with
 * those methods still works as a test double.
 */
export abstract class TransactionManager<U extends UnitOfWork = UnitOfWork> {
  abstract runInTransaction<T>(
    fn: (uow: U) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;

  /** The unit of work open in this async context, if there is one. */
  abstract current(): U | undefined;

  abstract isInTransaction(): boolean;

  abstract afterCommit(hook: TransactionHook): void;
}
