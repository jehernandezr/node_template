import type { ApiKeyPrincipal } from '../../api-keys/api-key-principal.js';
import { ApiKeyResolver } from '../../api-keys/api-key-resolver.js';

/** Resolutor de API keys de prueba: devuelve el principal fijado por prefijo y hash, y cuenta las llamadas. */
export class FakeApiKeyResolver extends ApiKeyResolver {
  private readonly principals = new Map<string, ApiKeyPrincipal>();
  private resolved = 0;

  async resolve(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined> {
    this.resolved += 1;
    return this.principals.get(`${prefix}:${secretHash}`);
  }

  /** Fija el principal que devuelve `resolve(prefix, secretHash)`. */
  set(prefix: string, secretHash: string, principal: ApiKeyPrincipal): void {
    this.principals.set(`${prefix}:${secretHash}`, principal);
  }

  /** Veces que se llamó a `resolve`. */
  get resolveCount(): number {
    return this.resolved;
  }
}
