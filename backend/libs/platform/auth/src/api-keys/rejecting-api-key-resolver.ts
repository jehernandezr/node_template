import { ApiKeyResolver } from './api-key-resolver.js';
import type { ApiKeyPrincipal } from './api-key-principal.js';

/** Resolver for the services that do not accept API keys: none is valid. */
export class RejectingApiKeyResolver extends ApiKeyResolver {
  async resolve(): Promise<ApiKeyPrincipal | undefined> {
    return undefined;
  }
}
