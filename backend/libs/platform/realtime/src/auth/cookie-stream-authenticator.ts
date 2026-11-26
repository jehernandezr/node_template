import { AccessTokenVerifier, AuthenticationError } from '@platform/auth';
import { AccessTokenStreamAuthenticator } from './access-token-stream-authenticator.js';
import type { StreamCredentials } from './stream-credentials.js';

/**
 * Access token in a cookie: the browser's `EventSource` cannot send `Authorization`, but it can send the
 * origin's cookies. The token is verified the same way as in `Authorization`, so revocation also applies here.
 */
export class CookieStreamAuthenticator extends AccessTokenStreamAuthenticator {
  constructor(
    verifier: AccessTokenVerifier,
    private readonly cookieName: string,
  ) {
    super(verifier);
  }

  protected override tokenOf(credentials: StreamCredentials): string {
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
