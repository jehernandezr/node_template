import { HttpLimits } from './http-limits.js';

/** Reads the `Bearer` from the `Authorization` header and distinguishes its types by prefix. */
export class BearerTokenReader {
  private static readonly PATTERN = /^Bearer ([^\s]+)$/i;

  /**
   * Returns the header token, or `undefined` if there is no well-formed `Bearer`. A repeated header does not count.
   * @param header `Authorization` header.
   * @returns The token, or `undefined`.
   */
  static read(header: string | string[] | undefined): string | undefined {
    if (typeof header !== 'string') {
      return undefined;
    }
    return BearerTokenReader.PATTERN.exec(header)?.[1];
  }

  /**
   * Tells whether a bearer token is a session token.
   * @param token Bearer token.
   * @returns `true` for a session token.
   */
  static isSessionToken(token: string): boolean {
    return token.startsWith(HttpLimits.SESSION_TOKEN_PREFIX);
  }

  /**
   * Tells whether a bearer token is an API key.
   * @param token Bearer token.
   * @returns `true` for an API key.
   */
  static isApiKey(token: string): boolean {
    return token.startsWith(HttpLimits.API_KEY_PREFIX);
  }
}
