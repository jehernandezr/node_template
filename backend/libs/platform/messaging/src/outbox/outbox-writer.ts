import type { OutboxAppend } from './outbox.js';

/**
 * Write side of the outbox. `append` saves the record in the transaction
 * open in the current async context, so it is committed or rolled back with the
 * business change. The adapter finds that transaction with its own
 * `TransactionManager`. Used through `OutboxMessageBus`.
 */
export abstract class OutboxWriter {
  /**
   * Appends a message to the outbox in the open transaction.
   * @param record Envelope and target.
   */
  abstract append(record: OutboxAppend): Promise<void>;
}
