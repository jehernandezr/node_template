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
 * Catálogo de códigos que puede responder la entrada HTTP: los transversales, los de auth, los de
 * límite de tasa y los de identity (que `AccessTokenVerifier` lanza en cualquier servicio), más los
 * del servicio.
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
   * @throws Error con todos los códigos de `route.errors` del contrato que no tienen entrada.
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
      throw new Error(`Códigos de error sin entrada en el catálogo: ${codes}`);
    }
  }
}
