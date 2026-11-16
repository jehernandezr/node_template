import { createHash } from 'node:crypto';
import { ApiKeyEnvironment } from './api-key-environment.enum.js';
import type { ParsedApiKey } from './parsed-api-key.js';

/**
 * Formato `sk_<live|test>_<prefijo>_<secreto>`: el prefijo son de 8 a 16
 * caracteres `[A-Za-z0-9]` y el secreto de 32 a 64 del mismo alfabeto. Utilidad
 * pura, sin estado.
 */
export class ApiKeyFormat {
  /** Largo máximo de una key completa; más largo se rechaza sin analizarlo. */
  static readonly MAX_LENGTH = 128;

  private static readonly PATTERN =
    /^sk_(live|test)_([A-Za-z0-9]{8,16})_([A-Za-z0-9]{32,64})$/;

  /** `undefined` si `raw` no cumple el formato. Nunca lanza. */
  static parse(raw: string): ParsedApiKey | undefined {
    if (raw.length > ApiKeyFormat.MAX_LENGTH) {
      return undefined;
    }
    const match = ApiKeyFormat.PATTERN.exec(raw);
    if (match === null) {
      return undefined;
    }
    return {
      environment:
        match[1] === ApiKeyEnvironment.Live
          ? ApiKeyEnvironment.Live
          : ApiKeyEnvironment.Test,
      prefix: match[2] ?? '',
      secret: match[3] ?? '',
    };
  }

  /** SHA-256 del secreto en hexadecimal: el campo del hash `auth:apikey:{prefix}`. */
  static hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }
}
