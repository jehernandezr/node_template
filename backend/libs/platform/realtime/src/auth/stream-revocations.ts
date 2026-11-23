import type { StreamPrincipal } from './stream-principal.js';

/**
 * Revocaciones que una conexión abierta no recibe por su stream. La de una sesión o la de un usuario llegan
 * como trama; la de un tenant no nombra usuarios, así que cada conexión la consulta en su latido.
 */
export abstract class StreamRevocations {
  /** `true` si el tenant del token se revocó o se suspendió después de `openedAt`. */
  abstract revokedSince(
    principal: StreamPrincipal,
    openedAt: Date,
  ): Promise<boolean>;
}
