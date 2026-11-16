import { HttpLimits } from './http-limits.js';

/** Lee el `Bearer` del header `Authorization` y distingue sus tipos por prefijo. */
export class BearerTokenReader {
  private static readonly PATTERN = /^Bearer ([^\s]+)$/i;

  /** Token del header, o `undefined` si no hay un `Bearer` bien formado. Un header repetido no cuenta. */
  static read(header: string | string[] | undefined): string | undefined {
    if (typeof header !== 'string') {
      return undefined;
    }
    return BearerTokenReader.PATTERN.exec(header)?.[1];
  }

  static isSessionToken(token: string): boolean {
    return token.startsWith(HttpLimits.SESSION_TOKEN_PREFIX);
  }

  static isApiKey(token: string): boolean {
    return token.startsWith(HttpLimits.API_KEY_PREFIX);
  }
}
