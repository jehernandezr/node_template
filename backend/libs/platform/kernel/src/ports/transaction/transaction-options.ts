import type { IsolationLevel } from './isolation-level.js';

/** Options of `TransactionManager.runInTransaction`. */
export interface TransactionOptions {
  readonly isolation?: IsolationLevel;
  readonly readOnly?: boolean;
  /** Maximum duration of each statement in the transaction. Without a value, the database default is used. */
  readonly statementTimeoutMs?: number;
}
