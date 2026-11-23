import { TokenAudience } from '@contracts/identity';
import { AccessTokenVerifier } from '@platform/auth';
import type { StreamCredentials } from './stream-credentials.js';
import type { StreamPrincipal } from './stream-principal.js';
import { StreamAuthenticator } from './stream-authenticator.js';

/**
 * Base de los autenticadores que reciben un access token: lo verifica en local, sin llamar a identity, con
 * su JWKS y el estado de revocación compartido. Cada subclase sabe de dónde sacar el token.
 */
export abstract class AccessTokenStreamAuthenticator extends StreamAuthenticator {
  protected constructor(private readonly verifier: AccessTokenVerifier) {
    super();
  }

  async authenticate(credentials: StreamCredentials): Promise<StreamPrincipal> {
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

  /** @throws AuthenticationError si las credenciales no traen el token. */
  protected abstract tokenOf(credentials: StreamCredentials): string;
}
