import { InvalidTenantIdError } from './invalid-tenant-id.error.js';
import { ValueObject } from '../value-object.js';

/**
 * Tenant identifier. A single maximum length for the whole platform:
 * the messaging envelope, the internal API and the shard router share it.
 */
export class TenantId extends ValueObject<{ value: string }> {
  /** Maximum accepted length, whatever the format. */
  static readonly MAX_LENGTH = 128;

  /** Default format: UUIDv7. */
  static readonly DEFAULT_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private constructor(value: string) {
    super({ value });
  }

  /**
   * Validates and creates a lowercase `TenantId`. Throws `InvalidTenantIdError` if
   * it is not a string of 1 to `MAX_LENGTH` characters that matches `pattern`.
   * @param raw Tenant id text.
   * @param pattern Allowed pattern.
   * @returns The tenant id.
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

  /** Text of the tenant id. */
  get value(): string {
    return this.props.value;
  }

  override toString(): string {
    return this.props.value;
  }
}
