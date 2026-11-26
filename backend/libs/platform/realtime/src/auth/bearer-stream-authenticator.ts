import { AccessTokenVerifier, AuthenticationError } from '@platform/auth';
import { AccessTokenStreamAuthenticator } from './access-token-stream-authenticator.js';
import type { StreamCredentials } from './stream-credentials.js';

/** Access token in `Authorization: Bearer`: used by the native app and the front's SSE client. */
export class BearerStreamAuthenticator extends AccessTokenStreamAuthenticator {
  private static readonly SCHEME = /^Bearer\s+(\S+)$/i;

  constructor(verifier: AccessTokenVerifier) {
    super(verifier);
  }

  protected override tokenOf(credentials: StreamCredentials): string {
    const token = BearerStreamAuthenticator.SCHEME.exec(
      credentials.authorization ?? '',
    )?.[1];
    if (token === undefined) {
      throw AuthenticationError.unauthenticated('missing bearer token');
    }
    return token;
  }
}
