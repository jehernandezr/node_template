import { TokenAudience } from '@contracts/identity';
import { AccessTokenVerifier } from '@platform/auth';
import type { StreamCredentials } from './stream-credentials.js';
import type { StreamPrincipal } from './stream-principal.js';
import { StreamAuthenticator } from './stream-authenticator.js';

/**
 * Base of the authenticators that receive an access token: verifies it locally, without calling identity, with
 * its JWKS and the shared revocation state. Each subclass knows where to get the token from.
 */
export abstract class AccessTokenStreamAuthenticator extends StreamAuthenticator {
  protected constructor(private readonly verifier: AccessTokenVerifier) {
    super();
  }

  override async authenticate(
    credentials: StreamCredentials,
  ): Promise<StreamPrincipal> {
    const actor = await this.verifier.verify(this.tokenOf(credentials), {
      audience: TokenAudience.Api,
    });
    return {
      userId: actor.userId,
      tenantId: actor.tenantId,
      homeTenantId: actor.homeTenantId,
      sessionId: actor.sessionId,
      sessionExpiresAt: actor.sessionExpiresAt,
    };
  }

  /** @throws AuthenticationError if the credentials do not carry the token. */
  protected abstract tokenOf(credentials: StreamCredentials): string;
}
