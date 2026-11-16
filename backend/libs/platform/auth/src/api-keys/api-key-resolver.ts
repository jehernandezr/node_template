import type { ApiKeyPrincipal } from './api-key-principal.js';

/**
 * Fuente de verdad de las API keys: identity la implementa en proceso y los
 * demás servicios con la operación interna `identity.api-keys.authenticate.v1`.
 */
export abstract class ApiKeyResolver {
  /** El principal si el hash del secreto corresponde a una key vigente de ese prefijo; `undefined` si no. */
  abstract resolve(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined>;
}
