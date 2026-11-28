import { AuthenticationError } from '@platform/auth';
import { StreamAuthenticator } from '../../auth/stream-authenticator.js';
import type { StreamPrincipal } from '../../auth/stream-principal.js';

/** Authenticator whose revocation state cannot be checked, as with the shared state store down. */
export class UnavailableStreamAuthenticator extends StreamAuthenticator {
  override authenticate(): Promise<StreamPrincipal> {
    return Promise.reject(
      AuthenticationError.stateUnavailable(new Error('state store down')),
    );
  }
}
