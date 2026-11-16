import { InvalidTenantIdError } from './invalid-tenant-id.error.js';
import { ValueObject } from '../value-object.js';

/**
 * Identificador de tenant. Una sola longitud máxima para toda la plataforma:
 * el sobre de mensajería, la API interna y el router de shards la comparten.
 */
export class TenantId extends ValueObject<{ value: string }> {
  /** Longitud máxima aceptada, sea cual sea el formato. */
  static readonly MAX_LENGTH = 128;

  /** Formato por defecto: UUIDv7. */
  static readonly DEFAULT_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private constructor(value: string) {
    super({ value });
  }

  /**
   * Valida y crea un `TenantId` en minúsculas. Lanza `InvalidTenantIdError` si
   * no es un texto de 1 a `MAX_LENGTH` caracteres que cumpla `pattern`.
   */
  static from(
    raw: string,
    pattern: RegExp = TenantId.DEFAULT_PATTERN,
  ): TenantId {
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new InvalidTenantIdError('empty');
    }
    if (raw.length > TenantId.MAX_LENGTH) {
      throw new InvalidTenantIdError('too long');
    }
    if (!pattern.test(raw)) {
      throw new InvalidTenantIdError('format');
    }
    return new TenantId(raw.toLowerCase());
  }

  get value(): string {
    return this.props.value;
  }

  override toString(): string {
    return this.props.value;
  }
}
