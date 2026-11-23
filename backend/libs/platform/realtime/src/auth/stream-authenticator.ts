import type { StreamCredentials } from './stream-credentials.js';
import type { StreamPrincipal } from './stream-principal.js';

/** Autentica una conexión de tiempo real. */
export abstract class StreamAuthenticator {
  /** @throws AuthenticationError si las credenciales faltan o no son válidas. */
  abstract authenticate(
    credentials: StreamCredentials,
  ): Promise<StreamPrincipal>;
}
