import { AuthStateReader } from '@platform/auth';
import type { StreamPrincipal } from './stream-principal.js';
import { StreamRevocations } from './stream-revocations.js';

/** `StreamRevocations` sobre la época del tenant en el estado de autenticación compartido de identity. */
export class AuthStateStreamRevocations extends StreamRevocations {
  constructor(private readonly state: AuthStateReader) {
    super();
  }

  /**
   * La época tiene resolución de segundos y el `iat` del token no supera el segundo de apertura: una conexión
   * abierta en el mismo segundo de la revocación no se distingue de una anterior, así que también se cierra.
   * Quien se reconecte un segundo después vuelve a entrar con su token si este sigue vigente.
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
