import {
  type Clock,
  type IdGenerator,
  SystemClock,
  UuidV7IdGenerator,
} from '@platform/kernel';
import {
  canonicalJson,
  type IdempotencyStore,
  InMemoryIdempotencyStore,
} from '@platform/primitives';

/** Result stored when a consumer finishes a message. */
export interface ProcessedMessage {
  /** Epoch milliseconds at which the handler finished. */
  readonly processedAt: number;
}

/**
 * Port for consumer idempotency: the three-state `IdempotencyStore` of
 * `@platform/primitives`, keyed by {@link processedMessageKey}.
 *
 * - `claim` answers `acquired` (with a claim token and a lease), `in-progress`
 *   (another delivery is running the handler) or `completed`.
 * - The dispatcher asks for a lease of at least the queue visibility timeout
 *   (`minLeaseMs`), so a redelivery while the first handler still runs finds the
 *   claim `in-progress` and is left for redelivery instead of acked.
 * - `complete` and `release` only accept the current claim token.
 *
 * A real adapter should `complete` in the same transaction as the handler's
 * effects, using the dispatcher's `runInContext`.
 */
export type ProcessedMessageStore = IdempotencyStore<ProcessedMessage>;

/** Idempotency key of `(consumer, message id)`: a canonical JSON array, so no separator can collide. */
export function processedMessageKey(consumer: string, id: string): string {
  return canonicalJson([consumer, id]);
}

/** In-memory adapter, suitable for tests and local runs. */
export class InMemoryProcessedMessageStore
  extends InMemoryIdempotencyStore<ProcessedMessage>
  implements ProcessedMessageStore
{
  constructor(
    clock: Clock = new SystemClock(),
    ids: IdGenerator = new UuidV7IdGenerator(),
  ) {
    super(clock, ids);
  }
}
