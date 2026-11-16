import { HttpLimits } from '../http-limits.js';
import { CookieParser } from './cookie-parser.js';

/** Cookie de sesión del canal web: `__Host-session`, sin `Domain`, con `Secure` y `SameSite=Strict`. */
export class SessionCookie {
  /** Valor de la cookie de sesión, o `undefined` si no vino. Con varios headers gana el primero. */
  read(cookieHeader: string | string[] | undefined): string | undefined {
    const header = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    return CookieParser.parse(header).get(HttpLimits.SESSION_COOKIE_NAME);
  }

  serialize(token: string, maxAgeMs: number): string {
    const maxAge = Math.floor(maxAgeMs / 1000);
    return `${HttpLimits.SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; ${SessionCookie.ATTRIBUTES}`;
  }

  serializeClear(): string {
    return `${HttpLimits.SESSION_COOKIE_NAME}=; Max-Age=0; ${SessionCookie.ATTRIBUTES}`;
  }

  private static readonly ATTRIBUTES =
    'Path=/; HttpOnly; Secure; SameSite=Strict';
}
