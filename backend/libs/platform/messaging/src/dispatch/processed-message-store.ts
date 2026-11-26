import { IdempotencyStore } from '@platform/kernel';

/** Result stored when a consumer finishes a message. */
export interface ProcessedMessage {
  /** Epoch milliseconds at which the handler finished. */
  readonly processedAt: number;
}

/**
 * Consumer idempotency port: the kernel's three-state `IdempotencyStore`,
 * with the key of {@link ProcessedMessageKey}, plus the
 * retention of finished ones.
 *
 * - `claim` answers `acquired` (with token and lease), `in-progress` (another delivery
 *   is running the handler) or `completed`.
 * - The dispatcher asks for a lease of at least the queue visibility timeout
 *   (`minLeaseMs`), so a repeated delivery while the first one is still running
 *   finds the claim `in-progress` and is left for redelivery instead of being acknowledged.
 * - `complete` and `release` only accept the current token.
 *
 * A real adapter must run `complete` in the same transaction as the
 * handler effects, with the dispatcher `runInContext`.
 */
export abstract class ProcessedMessageStore extends IdempotencyStore<ProcessedMessage> {
  /**
   * Deletes messages finished before `before`. Returns how many it removed.
   * @param before Instant the completion must predate.
   * @returns How many were removed.
   */
  abstract purgeCompleted(before: Date): Promise<number>;
}
