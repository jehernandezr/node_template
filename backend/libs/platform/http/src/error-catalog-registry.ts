import {
  ErrorCatalog,
  type ErrorCatalogEntry,
  type ServiceContract,
  platformErrorCatalog,
} from '@contracts/platform';
import { identityErrorCatalog } from '@contracts/identity';
import { authErrorCatalog } from '@platform/auth';
import { rateLimitErrorCatalog } from '@platform/rate-limit';

/**
 * Catalog of codes the HTTP entry can respond with: the cross-cutting ones, auth, rate
 * limit and identity ones (which `AccessTokenVerifier` throws in any service), plus those
 * of the service.
 */
export class ErrorCatalogRegistry {
  private readonly catalog = new ErrorCatalog();

  constructor(catalogs: readonly (readonly ErrorCatalogEntry[])[]) {
    this.catalog.register(platformErrorCatalog);
    this.catalog.register(authErrorCatalog);
    this.catalog.register(rateLimitErrorCatalog);
    this.catalog.register(identityErrorCatalog);
    for (const catalog of catalogs) {
      this.catalog.register(catalog);
    }
  }

  get(code: string): ErrorCatalogEntry | undefined {
    return this.catalog.get(code);
  }

  /**
   * @throws Error with all the codes in the contract's `route.errors` that have no entry.
   */
  assertCovers(contract: ServiceContract): void {
    const missing = new Set<string>();
    for (const route of Object.values(contract.routes)) {
      for (const code of route.errors) {
        if (this.get(code) === undefined) {
          missing.add(code);
        }
      }
    }
    if (missing.size > 0) {
      const codes = [...missing].sort().join(', ');
      throw new Error(`Error codes with no catalog entry: ${codes}`);
    }
  }
}
