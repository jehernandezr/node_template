import { inspect } from 'node:util';
import { z } from 'zod';

/** Texto que se muestra en lugar del secreto en `toString`, `toJSON` e `inspect`. */
export const SECRET_PLACEHOLDER = '[REDACTED]';

/**
 * Guarda un valor sensible. El texto crudo vive en un campo privado de la
 * clase, así que spread, `JSON.stringify`, `String(...)` y `util.inspect` solo
 * muestran `[REDACTED]`. Se lee con `reveal()` en el punto de uso.
 */
export class Secret {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  /** Devuelve el valor crudo. Nunca lo registres ni lo serialices. */
  reveal(): string {
    return this.#value;
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

  /** Indica si `value` es un `Secret`. */
  static is(value: unknown): value is Secret {
    return value instanceof Secret;
  }
}

export interface SecretOptions {
  /** Longitud mínima del valor crudo. */
  minLength?: number;
  /** Longitud máxima del valor crudo. */
  maxLength?: number;
}

/**
 * Esquema para una variable de entorno sensible (contraseña, clave de API,
 * token). Se convierte en un `Secret`; los mensajes de validación nunca
 * incluyen el valor crudo ni una parte de él.
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
