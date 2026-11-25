import type { CallOutcome } from '@platform/primitives';

/** What a handler returns: the result of the call and whether its effects are committed. */
export interface HandlerResult<T> {
  readonly outcome: CallOutcome<T>;
  /**
   * `false` rolls back the handler transaction. A final result (success or
   * business error) is still stored so a retry repeats it; one that
   * is not final releases the key. Defaults to `true`. Without `TransactionManager`
   * there is nothing to roll back and the result is treated like any other.
   */
  readonly commit?: boolean;
}
