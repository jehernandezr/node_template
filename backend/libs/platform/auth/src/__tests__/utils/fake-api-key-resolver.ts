import type { ApiKeyPrincipal } from '../../api-keys/api-key-principal.js';
import { ApiKeyResolver } from '../../api-keys/api-key-resolver.js';

/** Test API key resolver: returns the principal set per prefix and hash, and counts the calls. */
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

  /** Sets the principal returned by `resolve(prefix, secretHash)`. */
  set(prefix: string, secretHash: string, principal: ApiKeyPrincipal): void {
    this.principals.set(`${prefix}:${secretHash}`, principal);
  }

  /** Number of times `resolve` was called. */
  get resolveCount(): number {
    return this.resolved;
  }
}
