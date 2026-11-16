import type { ClientInfo } from './client-info.js';

/**
 * Lo que un controller puede hacer con la petición y la respuesta HTTP sin conocer Express:
 * leer quién es el cliente y manejar la cookie de sesión. Con `ClientChannel.Native` la cookie
 * no se usa.
 */
export abstract class HttpExchange {
  abstract readonly client: ClientInfo;

  /** Valor de la cookie de sesión de la petición, o `undefined` si no vino. */
  abstract sessionCookie(): string | undefined;

  /**
   * Agrega `Set-Cookie` con la cookie de sesión: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`,
   * sin `Domain` y `Max-Age` en segundos a partir de `maxAgeMs`.
   */
  abstract setSessionCookie(token: string, maxAgeMs: number): void;

  /** Agrega `Set-Cookie` que borra la cookie de sesión (`Max-Age=0`). */
  abstract clearSessionCookie(): void;

  abstract setHeader(name: string, value: string): void;
}
