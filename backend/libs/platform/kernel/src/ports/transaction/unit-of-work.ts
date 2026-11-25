import type { TransactionHook } from './transaction-hook.js';

/**
 * Unit of work: an open transaction on a logical database. It does not expose
 * the database session; the adapter that needs it (a repository, the
 * outbox) takes it from its own `TransactionManager`.
 */
export interface UnitOfWork {
  /** Name of the logical database (the shard) where the transaction lives. */
  readonly database: string;
  /**
   * Registers an effect for after the commit: publishing events, invalidating
   * cache, notifying another process. It runs outside the transaction, in
   * registration order. If it fails, it is reported and does not undo the commit.
   */
  afterCommit(hook: TransactionHook): void;
  /** Registers an effect that runs only if the transaction is rolled back. */
  afterRollback(hook: TransactionHook): void;
}
