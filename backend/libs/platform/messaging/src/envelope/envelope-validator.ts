import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import { EnvelopeLimits } from './envelope-limits.js';
import type { MessageEnvelope } from './message-envelope.js';
import { messageEnvelopeSchema } from './message-envelope.schema.js';

/** Valida el sobre contra su esquema y sus límites de tamaño. */
export class EnvelopeValidator {
  private readonly encoder = new TextEncoder();

  /** Tamaño de `value` serializado como JSON, en bytes. */
  sizeBytes(value: unknown): number {
    return this.encoder.encode(JSON.stringify(value)).byteLength;
  }

  /** Tamaño en bytes de un texto ya serializado. */
  textBytes(text: string): number {
    return this.encoder.encode(text).byteLength;
  }

  /** @throws MessagingError `PayloadTooLarge` si `size` supera el máximo; sin `size`, el mensaje no lo menciona. */
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
   * Comprueba los atributos del sobre contra el esquema. `data` queda para el
   * contrato del mensaje.
   * @throws MessagingError `InvalidEnvelope`.
   */
  validate(candidate: unknown): MessageEnvelope {
    const parsed = messageEnvelopeSchema.safeParse(candidate);
    if (!parsed.success) {
      throw this.invalid(parsed.error.message);
    }
    // Zod infiere `data` como opcional; el contrato lo valida después.
    return parsed.data as MessageEnvelope;
  }

  /**
   * Valida un sobre, lo pasa por JSON (el valor devuelto es exactamente lo que
   * un transporte llevaría) y aplica los límites de tamaño y de atributos.
   * @throws MessagingError `InvalidEnvelope` o `PayloadTooLarge`.
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

  /** Error `InvalidEnvelope` con el texto `invalid envelope: <motivo>`. */
  invalid(reason: string): MessagingError {
    return new MessagingError(
      MessagingErrorCode.InvalidEnvelope,
      `invalid envelope: ${reason}`,
    );
  }
}
