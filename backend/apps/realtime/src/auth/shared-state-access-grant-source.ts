import {
  AccessGrantSource,
  AuthenticationError,
  type AccessGrant,
} from '@platform/auth';

/**
 * `apps/realtime` does not call identity: a token is verified with its JWKS and the shared state, and the
 * permission versions identity writes to Valkey are enough to accept it. If that state is missing, the connection
 * is rejected and the client retries, instead of opening a dependency on identity for each connection.
 */
export class SharedStateAccessGrantSource extends AccessGrantSource {
  override async fetch(): Promise<AccessGrant> {
    throw AuthenticationError.stateUnavailable(
      'realtime reads only the shared auth state',
    );
  }
}
