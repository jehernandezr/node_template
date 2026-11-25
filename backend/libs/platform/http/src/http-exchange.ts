import type { ClientInfo } from './client-info.js';

/**
 * What a controller can do with the HTTP request and response without knowing Express:
 * read who the client is and handle the session cookie. With `ClientChannel.Native` the cookie
 * is not used.
 */
export abstract class HttpExchange {
  abstract readonly client: ClientInfo;

  /** Returns the request's session cookie value, or `undefined` if absent. */
  abstract sessionCookie(): string | undefined;

  /**
   * Adds `Set-Cookie` with the session cookie: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`,
   * no `Domain` and `Max-Age` in seconds from `maxAgeMs`.
   */
  abstract setSessionCookie(token: string, maxAgeMs: number): void;

  /** Adds a `Set-Cookie` that clears the session cookie (`Max-Age=0`). */
  abstract clearSessionCookie(): void;

  abstract setHeader(name: string, value: string): void;
}
