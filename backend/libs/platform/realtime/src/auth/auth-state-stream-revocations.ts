import { AuthStateReader } from '@platform/auth';
import type { StreamPrincipal } from './stream-principal.js';
import { StreamRevocations } from './stream-revocations.js';

/** `StreamRevocations` sobre la época del tenant en el estado de autenticación compartido de identity. */
export class AuthStateStreamRevocations extends StreamRevocations {
  constructor(private readonly state: AuthStateReader) {
    super();
  }

  /**
   * El token pasó la verificación al abrir, así que su `iat` no supera el segundo de apertura: una época que
   * revoca lo emitido después de ese segundo también lo revoca a él.
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
      epoch.revokedBefore > Math.floor(openedAt.getTime() / 1000)
    );
  }
}
