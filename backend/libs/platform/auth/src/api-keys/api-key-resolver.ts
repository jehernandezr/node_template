import type { ApiKeyPrincipal } from './api-key-principal.js';

/**
 * Source of truth for API keys: identity implements it in process and the
 * other services with the internal operation `identity.api-keys.authenticate.v1`.
 */
export abstract class ApiKeyResolver {
  /**
   * Returns the principal if the secret hash matches a valid key of that prefix; `undefined` otherwise.
   * @param prefix Public prefix.
   * @param secretHash SHA-256 of the secret.
   * @returns The principal, or `undefined`.
   */
  abstract resolve(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined>;
}
