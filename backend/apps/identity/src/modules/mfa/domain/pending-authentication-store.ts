import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';

/** Authentications waiting for a second factor. They live ten minutes and are read with the `mfaToken`. */
export abstract class PendingAuthenticationStore {
  /**
   * Saves and returns the `mfaToken` that travels to the client.
   * @param pending Pending authentication.
   * @returns The token.
   */
  abstract save(pending: PendingAuthentication): Promise<string>;
  /**
   * Reads a pending authentication without consuming it.
   * @param mfaToken Token of the client.
   * @returns The pending authentication, or `undefined`.
   */
  abstract find(mfaToken: string): Promise<PendingAuthentication | undefined>;
  /**
   * Consumes the token: a second verification with the same token fails.
   * @param mfaToken Token of the client.
   * @returns The pending authentication, or `undefined` when already used.
   */
  abstract consume(
    mfaToken: string,
  ): Promise<PendingAuthentication | undefined>;
}
