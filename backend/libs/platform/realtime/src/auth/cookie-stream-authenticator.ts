import { AccessTokenVerifier, AuthenticationError } from '@platform/auth';
import { AccessTokenStreamAuthenticator } from './access-token-stream-authenticator.js';
import type { StreamCredentials } from './stream-credentials.js';

/**
 * Access token en una cookie: el `EventSource` del navegador no puede mandar `Authorization`, pero sí las
 * cookies del origen. El token se verifica igual que en `Authorization`, así la revocación aplica también aquí.
 */
export class CookieStreamAuthenticator extends AccessTokenStreamAuthenticator {
  constructor(
    verifier: AccessTokenVerifier,
    private readonly cookieName: string,
  ) {
    super(verifier);
  }

  protected tokenOf(credentials: StreamCredentials): string {
    const prefix = `${this.cookieName}=`;
    const token = (credentials.cookie ?? '')
      .split(';')
      .map((pair) => pair.trim())
      .find((pair) => pair.startsWith(prefix))
      ?.slice(prefix.length);
    if (token === undefined || token === '') {
      throw AuthenticationError.unauthenticated('missing stream cookie');
    }
    return decodeURIComponent(token);
  }
}
