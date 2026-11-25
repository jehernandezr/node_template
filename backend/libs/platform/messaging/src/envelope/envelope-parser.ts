import { EnvelopeLimits } from './envelope-limits.js';
import type { EnvelopeValidator } from './envelope-validator.js';
import type { MessageEnvelope } from './message-envelope.js';

/**
 * Turns a raw delivery into a validated envelope. Accepts JSON as text
 * (as a transport receives it) or an already decoded value. The size
 * limit runs first, before `JSON.parse` and any schema, so
 * oversized input never reaches the parsers.
 */
export class EnvelopeParser {
  constructor(private readonly validator: EnvelopeValidator) {}

  /** @throws MessagingError `PayloadTooLarge` o `InvalidEnvelope`. */
  parse(raw: unknown): MessageEnvelope {
    return this.validator.validate(this.decode(raw));
  }

  private decode(raw: unknown): unknown {
    if (typeof raw !== 'string') {
      this.validator.assertSize(this.serializedSize(raw));
      return raw;
    }
    // A UTF-16 length over the limit already implies more bytes than the limit.
    if (raw.length > EnvelopeLimits.MAX_BYTES) {
      this.validator.assertSize();
    }
    this.validator.assertSize(this.validator.textBytes(raw));
    try {
      return JSON.parse(raw);
    } catch {
      throw this.validator.invalid('body is not valid JSON');
    }
  }

  private serializedSize(raw: unknown): number {
    try {
      return this.validator.sizeBytes(raw);
    } catch {
      throw this.validator.invalid('envelope is not serializable as JSON');
    }
  }
}
