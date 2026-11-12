import { inspect } from 'node:util';
import { z } from 'zod';

/** Text shown in place of a secret by `toString`, `toJSON` and `inspect`. */
export const SECRET_PLACEHOLDER = '[REDACTED]';

const values = new WeakMap<Secret, string>();

/**
 * Holds a sensitive configuration value. The raw text is not an own property,
 * so spreading, `JSON.stringify`, `String(...)` and `util.inspect` only ever
 * show `[REDACTED]`. Read it explicitly with `reveal()` at the point of use.
 */
export class Secret {
  constructor(value: string) {
    values.set(this, value);
  }

  /** Returns the raw value. Never log or serialize the result. */
  reveal(): string {
    return values.get(this) as string;
  }

  toString(): string {
    return SECRET_PLACEHOLDER;
  }

  toJSON(): string {
    return SECRET_PLACEHOLDER;
  }

  [inspect.custom](): string {
    return `Secret(${SECRET_PLACEHOLDER})`;
  }
}

/** Indica si `value` es un `Secret`. */
export function isSecret(value: unknown): value is Secret {
  return value instanceof Secret;
}

export interface SecretOptions {
  /** Minimum length of the raw value. */
  minLength?: number;
  /** Maximum length of the raw value. */
  maxLength?: number;
}

/**
 * Schema for a sensitive environment variable (password, API key, token).
 * It parses to a `Secret`; validation messages never include the raw value
 * nor any part of it.
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
