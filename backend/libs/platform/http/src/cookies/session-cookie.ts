import { HttpLimits } from '../http-limits.js';
import { CookieParser } from './cookie-parser.js';

/** Web channel session cookie: `__Host-session`, no `Domain`, with `Secure` and `SameSite=Strict`. */
export class SessionCookie {
  /**
   * Returns the session cookie value, or `undefined` if absent. With several headers the first one wins.
   * @param cookieHeader `Cookie` header.
   * @returns The value, or `undefined`.
   */
  read(cookieHeader: string | string[] | undefined): string | undefined {
    const header = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    return CookieParser.parse(header).get(HttpLimits.SESSION_COOKIE_NAME);
  }

  /**
   * Writes the `Set-Cookie` value that stores the session token in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie.
   * @param token Session token.
   * @param maxAgeMs Lifetime, rounded down to whole seconds.
   * @returns The header value.
   */
  serialize(token: string, maxAgeMs: number): string {
    const maxAge = Math.floor(maxAgeMs / 1000);
    return `${HttpLimits.SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; ${SessionCookie.ATTRIBUTES}`;
  }

  /**
   * Builds the `Set-Cookie` value that deletes the session cookie.
   * @returns The header value.
   */
  serializeClear(): string {
    return `${HttpLimits.SESSION_COOKIE_NAME}=; Max-Age=0; ${SessionCookie.ATTRIBUTES}`;
  }

  private static readonly ATTRIBUTES =
    'Path=/; HttpOnly; Secure; SameSite=Strict';
}
