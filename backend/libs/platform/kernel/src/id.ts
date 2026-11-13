import { InvalidIdError } from './invalid-id.error.js';
import { ValueObject } from './value-object.js';

/** UUID versión 7 (variante RFC 9562: 8, 9, a o b). */
const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Identificador UUIDv7. Se ordena por tiempo de creación. No se genera aquí: los
 * identificadores nuevos salen del puerto `IdGenerator`.
 */
export class Id extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  /** Valida y crea un `Id` desde un string. Lanza `InvalidIdError` si no es UUIDv7. */
  static from(value: string): Id {
    if (typeof value !== 'string' || !UUID_V7.test(value)) {
      throw new InvalidIdError(value);
    }
    return new Id(value.toLowerCase());
  }

  /** Fecha de creación codificada en los 48 bits de milisegundos del UUIDv7. */
  timestamp(): Date {
    const hex = this.props.value.slice(0, 8) + this.props.value.slice(9, 13);
    return new Date(Number.parseInt(hex, 16));
  }

  override toString(): string {
    return this.props.value;
  }
}
