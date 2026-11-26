import { createHash } from 'node:crypto';
import { ApiKeyEnvironment } from './api-key-environment.enum.js';
import type { ParsedApiKey } from './parsed-api-key.js';

/**
 * Format `sk_<live|test>_<prefix>_<secret>`: the prefix is 8 to 16
 * `[A-Za-z0-9]` characters and the secret 32 to 64 of the same alphabet. Pure
 * stateless utility.
 */
export class ApiKeyFormat {
  /** Maximum length of a full key; anything longer is rejected without parsing it. */
  static readonly MAX_LENGTH = 128;

  private static readonly PATTERN =
    /^sk_(live|test)_([A-Za-z0-9]{8,16})_([A-Za-z0-9]{32,64})$/;

  /**
   * `undefined` if `raw` does not match the format. Never throws.
   * @param raw Text to parse.
   * @returns The prefix and secret, or `undefined`.
   */
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

  /**
   * Hex SHA-256 of the secret: the field of the `auth:apikey:{prefix}` hash.
   * @param secret Secret part of the key.
   * @returns The hex hash.
   */
  static hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }
}
