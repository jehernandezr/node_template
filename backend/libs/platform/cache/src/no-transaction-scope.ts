import type { TransactionHook } from '@platform/kernel';
import type { CacheTransactions } from './cache-aside.options.js';

/** Scope without a transaction: the cache is always active. Used when the application has no transaction manager. */
export class NoTransactionScope implements CacheTransactions {
  /** Always `false`: there is never an open transaction. */
  isInTransaction(): boolean {
    return false;
  }

  /** Without a transaction there is no commit to wait for: the effect runs now, as in `TransactionManager`. */
  afterCommit(hook: TransactionHook): void {
    void hook();
  }
}
