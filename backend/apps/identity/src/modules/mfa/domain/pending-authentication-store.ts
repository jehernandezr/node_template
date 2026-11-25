import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';

/** Authentications waiting for a second factor. They live ten minutes and are read with the `mfaToken`. */
export abstract class PendingAuthenticationStore {
  /** Saves and returns the `mfaToken` that travels to the client. */
  abstract save(pending: PendingAuthentication): Promise<string>;
  abstract find(mfaToken: string): Promise<PendingAuthentication | undefined>;
  /** Consumes the token: a second verification with the same token fails. */
  abstract consume(
    mfaToken: string,
  ): Promise<PendingAuthentication | undefined>;
}
