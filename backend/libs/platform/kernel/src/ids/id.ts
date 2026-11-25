import { InvalidIdError } from '../errors/invalid-id.error.js';
import { ValueObject } from '../value-object.js';

/** UUID version 7 (RFC 9562 variant: 8, 9, a or b). */
const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * UUIDv7 identifier. It sorts by creation time. It is not generated here: new
 * identifiers come from the `IdGenerator` port.
 */
export class Id extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  /** Validates and creates an `Id` from a string. Throws `InvalidIdError` if it is not a UUIDv7. */
  static from(value: string): Id {
    if (typeof value !== 'string' || !UUID_V7.test(value)) {
      throw new InvalidIdError(value);
    }
    return new Id(value.toLowerCase());
  }

  /** Returns the creation date encoded in the 48 millisecond bits of the UUIDv7. */
  timestamp(): Date {
    const hex = this.props.value.slice(0, 8) + this.props.value.slice(9, 13);
    return new Date(Number.parseInt(hex, 16));
  }

  override toString(): string {
    return this.props.value;
  }
}
