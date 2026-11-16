import { ApiKeyResolver } from './api-key-resolver.js';
import type { ApiKeyPrincipal } from './api-key-principal.js';

/** Resolutor de los servicios que no aceptan API keys: ninguna es válida. */
export class RejectingApiKeyResolver extends ApiKeyResolver {
  async resolve(): Promise<ApiKeyPrincipal | undefined> {
    return undefined;
  }
}
