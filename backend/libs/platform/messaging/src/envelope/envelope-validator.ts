import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import { EnvelopeLimits } from './envelope-limits.js';
import type { MessageEnvelope } from './message-envelope.js';
import { messageEnvelopeSchema } from './message-envelope.schema.js';

/** Validates the envelope against its schema and its size limits. */
export class EnvelopeValidator {
  private readonly encoder = new TextEncoder();

  /** Size of `value` serialized as JSON, in bytes. */
  sizeBytes(value: unknown): number {
    return this.encoder.encode(JSON.stringify(value)).byteLength;
  }

  /** Size in bytes of an already serialized text. */
  textBytes(text: string): number {
    return this.encoder.encode(text).byteLength;
  }

  /** @throws MessagingError `PayloadTooLarge` if `size` exceeds the maximum; without `size`, the message does not mention it. */
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
   * @throws MessagingError `InvalidEnvelope`.
   */
  validate(candidate: unknown): MessageEnvelope {
    const parsed = messageEnvelopeSchema.safeParse(candidate);
    if (!parsed.success) {
      throw this.invalid(parsed.error.message);
    }
    // Zod infers `data` as optional; the contract validates it later.
    return parsed.data as MessageEnvelope;
  }

  /**
   * Validates an envelope, round-trips it through JSON (the returned value is exactly what
   * a transport would carry) and applies the size and attribute limits.
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

  /** `InvalidEnvelope` error with the text `invalid envelope: <reason>`. */
  invalid(reason: string): MessagingError {
    return new MessagingError(
      MessagingErrorCode.InvalidEnvelope,
      `invalid envelope: ${reason}`,
    );
  }
}
