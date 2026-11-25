import { HttpLimits } from './http-limits.js';

/** Reads the `Bearer` from the `Authorization` header and distinguishes its types by prefix. */
export class BearerTokenReader {
  private static readonly PATTERN = /^Bearer ([^\s]+)$/i;

  /** Returns the header token, or `undefined` if there is no well-formed `Bearer`. A repeated header does not count. */
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
