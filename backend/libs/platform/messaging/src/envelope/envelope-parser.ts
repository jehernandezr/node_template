import { EnvelopeLimits } from './envelope-limits.js';
import type { EnvelopeValidator } from './envelope-validator.js';
import type { MessageEnvelope } from './message-envelope.js';

/**
 * Convierte una entrega cruda en un sobre validado. Acepta un JSON como texto
 * (como lo recibe un transporte) o un valor ya decodificado. El límite de
 * tamaño corre primero, antes de `JSON.parse` y de cualquier esquema, así que
 * la entrada sobredimensionada nunca llega a los parsers.
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
    // Un largo UTF-16 sobre el límite ya implica más bytes que el límite.
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
