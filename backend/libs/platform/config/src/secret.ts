import { inspect } from 'node:util';
import { z } from 'zod';

/** Text shown in place of the secret in `toString`, `toJSON` and `inspect`. */
export const SECRET_PLACEHOLDER = '[REDACTED]';

/**
 * Holds a sensitive value. The raw text lives in a private field of the
 * class, so spread, `JSON.stringify`, `String(...)` and `util.inspect` only
 * show `[REDACTED]`. It is read with `reveal()` at the point of use.
 */
export class Secret {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  /**
   * Returns the raw value. Never log or serialize it.
   * @returns The secret value.
   */
  reveal(): string {
    return this.#value;
  }

  /**
   * Hides the value when converted to text.
   * @returns A redacted placeholder.
   */
  toString(): string {
    return SECRET_PLACEHOLDER;
  }

  /**
   * Hides the value when serialized.
   * @returns A redacted placeholder.
   */
  toJSON(): string {
    return SECRET_PLACEHOLDER;
  }

  /**
   * Hides the value when inspected by Node.
   * @returns A redacted placeholder.
   */
  [inspect.custom](): string {
    return `Secret(${SECRET_PLACEHOLDER})`;
  }

  /**
   * Whether `value` is a `Secret`.
   * @param value Value to check.
   * @returns `true` for a secret.
   */
  static is(value: unknown): value is Secret {
    return value instanceof Secret;
  }
}

export interface SecretOptions {
  /** Minimum length of the raw value. */
  minLength?: number;
  /** Maximum length of the raw value. */
  maxLength?: number;
}

/**
 * Schema for a sensitive environment variable (password, API key,
 * token). It becomes a `Secret`; validation messages never
 * include the raw value or any part of it.
 */
export function secret(options: SecretOptions = {}) {
  const { minLength = 1, maxLength } = options;
  return z.unknown().transform((value, ctx) => {
    if (typeof value !== 'string') {
      ctx.addIssue({ code: 'custom', message: 'expected a secret string' });
      return z.NEVER;
    }
    if (value.length < minLength) {
      ctx.addIssue({
        code: 'custom',
        message: `expected a secret of at least ${minLength} characters`,
      });
      return z.NEVER;
    }
    if (maxLength !== undefined && value.length > maxLength) {
      ctx.addIssue({
        code: 'custom',
        message: `expected a secret of at most ${maxLength} characters`,
      });
      return z.NEVER;
    }
    return new Secret(value);
  });
}
