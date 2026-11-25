import { AuthStateReader } from '@platform/auth';
import type { StreamPrincipal } from './stream-principal.js';
import { StreamRevocations } from './stream-revocations.js';

/** `StreamRevocations` over the tenant epoch in identity's shared authentication state. */
export class AuthStateStreamRevocations extends StreamRevocations {
  constructor(private readonly state: AuthStateReader) {
    super();
  }

  /**
   * The epoch has second resolution and the token's `iat` does not exceed the opening second: a connection
   * opened in the same second as the revocation cannot be told apart from an earlier one, so it is also closed.
   * Whoever reconnects a second later gets back in with their token if it is still valid.
   */
  async revokedSince(
    principal: StreamPrincipal,
    openedAt: Date,
  ): Promise<boolean> {
    const epoch = await this.state.tenantEpoch(principal.tenantId);
    if (epoch === undefined) {
      return false;
    }
    return (
      epoch.suspended ||
      epoch.revokedBefore >= Math.floor(openedAt.getTime() / 1000)
    );
  }
}
