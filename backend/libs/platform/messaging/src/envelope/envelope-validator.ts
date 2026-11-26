import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import { EnvelopeLimits } from './envelope-limits.js';
import type { MessageEnvelope } from './message-envelope.js';
import { messageEnvelopeSchema } from './message-envelope.schema.js';

/** Validates the envelope against its schema and its size limits. */
export class EnvelopeValidator {
  private readonly encoder = new TextEncoder();

  /**
   * Size of `value` serialized as JSON, in bytes.
   * @param value Value to measure.
   * @returns The size.
   */
  sizeBytes(value: unknown): number {
    return this.encoder.encode(JSON.stringify(value)).byteLength;
  }

  /**
   * Size in bytes of an already serialized text.
   * @param text Serialized text.
   * @returns The size.
   */
  textBytes(text: string): number {
    return this.encoder.encode(text).byteLength;
  }

  /**
   * Checks that a message fits in the limit.
   * @param size Size in bytes.
   * @throws MessagingError `PayloadTooLarge` if `size` exceeds the maximum; without `size`, the message does not mention it.
   */
  assertSize(size?: number): void {
    if (size !== undefined && size <= EnvelopeLimits.MAX_BYTES) {
      return;
    }
    throw new MessagingError(
      MessagingErrorCode.PayloadTooLarge,
      size === undefined
        ? `envelope exceeds the limit of ${EnvelopeLimits.MAX_BYTES} bytes`
        : `envelope is ${size} bytes, limit is ${EnvelopeLimits.MAX_BYTES}`,
    );
  }

  /**
   * Checks the envelope attributes against the schema. `data` is left to the
   * message contract.
   * Zod infers `data` as optional; the contract validates it later.
   * @param candidate Value to check.
   * @returns The envelope.
   * @throws MessagingError `InvalidEnvelope`.
   */
  validate(candidate: unknown): MessageEnvelope {
    const parsed = messageEnvelopeSchema.safeParse(candidate);
    if (!parsed.success) {
      throw this.invalid(parsed.error.message);
    }
    return parsed.data as MessageEnvelope;
  }

  /**
   * Validates an envelope, round-trips it through JSON (the returned value is exactly what
   * a transport would carry) and applies the size and attribute limits.
   * @param envelope Envelope to check.
   * @returns The wire envelope.
   * @throws MessagingError `InvalidEnvelope` or `PayloadTooLarge`.
   */
  toWire<T>(envelope: MessageEnvelope<T>): MessageEnvelope<T> {
    const wire: unknown = JSON.parse(JSON.stringify(envelope));
    this.validate(wire);
    const size = this.sizeBytes(wire);
    if (size > EnvelopeLimits.MAX_BYTES) {
      this.assertSize(size);
    }
    return wire as MessageEnvelope<T>;
  }

  /**
   * `InvalidEnvelope` error with the text `invalid envelope: <reason>`.
   * @param reason Why it is invalid.
   * @returns The error.
   */
  invalid(reason: string): MessagingError {
    return new MessagingError(
      MessagingErrorCode.InvalidEnvelope,
      `invalid envelope: ${reason}`,
    );
  }
}
