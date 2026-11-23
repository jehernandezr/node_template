import {
  AccessGrantSource,
  AuthenticationError,
  type AccessGrant,
} from '@platform/auth';

/**
 * `apps/realtime` no llama a identity: un token se verifica con su JWKS y el estado compartido, y las
 * versiones de permisos que identity escribe en Valkey bastan para aceptarlo. Si ese estado falta, la conexión
 * se rechaza y el cliente reintenta, en vez de abrir una dependencia con identity por cada conexión.
 */
export class SharedStateAccessGrantSource extends AccessGrantSource {
  async fetch(): Promise<AccessGrant> {
    throw AuthenticationError.stateUnavailable(
      'realtime reads only the shared auth state',
    );
  }
}
