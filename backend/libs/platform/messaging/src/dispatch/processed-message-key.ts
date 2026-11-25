import { CanonicalJson } from '@platform/primitives';

/** Idempotency key of `(consumer, message id)`. */
export class ProcessedMessageKey {
  /** Canonical JSON array: no separator can collide. */
  static of(consumer: string, id: string): string {
    return CanonicalJson.stringify([consumer, id]);
  }
}
