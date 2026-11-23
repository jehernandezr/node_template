import { AccessTokenVerifier, AuthenticationError } from '@platform/auth';
import { AccessTokenStreamAuthenticator } from './access-token-stream-authenticator.js';
import type { StreamCredentials } from './stream-credentials.js';

/** Access token en `Authorization: Bearer`: lo usan la app nativa y el cliente SSE del front. */
export class BearerStreamAuthenticator extends AccessTokenStreamAuthenticator {
  private static readonly SCHEME = /^Bearer\s+(\S+)$/i;

  constructor(verifier: AccessTokenVerifier) {
    super(verifier);
  }

  protected tokenOf(credentials: StreamCredentials): string {
    const token = BearerStreamAuthenticator.SCHEME.exec(
      credentials.authorization ?? '',
    )?.[1];
    if (token === undefined) {
      throw AuthenticationError.unauthenticated('missing bearer token');
    }
    return token;
  }
}
