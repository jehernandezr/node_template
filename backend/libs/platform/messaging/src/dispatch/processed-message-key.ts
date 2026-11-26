import { CanonicalJson } from '@platform/primitives';

/** Idempotency key of `(consumer, message id)`. */
export class ProcessedMessageKey {
  /**
   * Canonical JSON array: no separator can collide.
   * @param consumer Consumer name.
   * @param id Message id.
   * @returns The key.
   */
  static of(consumer: string, id: string): string {
    return CanonicalJson.stringify([consumer, id]);
  }
}
