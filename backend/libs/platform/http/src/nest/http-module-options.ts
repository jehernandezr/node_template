import type { ErrorCatalogEntry, ServiceContract } from '@contracts/platform';
import type { TokenAudience } from '@contracts/identity';

/** Options of `HttpModule.forRoot`. */
export interface HttpModuleOptions {
  /**
   * Service contract. At startup, every contract route must have a handler and every
   * error code a route declares must be in the catalog.
   */
  readonly contract: ServiceContract;
  /**
   * Service error catalogs. Added to `platformErrorCatalog`, `authErrorCatalog` and
   * `rateLimitErrorCatalog`, which the module always registers.
   */
  readonly catalogs?: readonly (readonly ErrorCatalogEntry[])[];
  /** Audience the `aud` claim of an access token must name. Defaults to `TokenAudience.Api`. */
  readonly audience?: TokenAudience;
  /**
   * Validates each route's response against its schema (`ContractOutputInterceptor`). Defaults
   * to `true` except in production.
   */
  readonly validateOutput?: boolean;
}
