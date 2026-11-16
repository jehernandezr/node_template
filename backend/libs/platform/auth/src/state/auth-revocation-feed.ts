import type { RevocationHandler } from './revocation-handler.js';

/** Avisos inmediatos de cada sesión revocada (canal `auth:revocations`). La entrega es como máximo una vez: el índice cubre lo que se pierda. */
export abstract class AuthRevocationFeed {
  /** Devuelve la función que da de baja el handler. */
  abstract subscribe(handler: RevocationHandler): Promise<() => Promise<void>>;
}
