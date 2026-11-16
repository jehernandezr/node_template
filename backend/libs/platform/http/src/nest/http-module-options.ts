import type { ErrorCatalogEntry, ServiceContract } from '@contracts/platform';
import type { TokenAudience } from '@contracts/identity';

/** Opciones de `HttpModule.forRoot`. */
export interface HttpModuleOptions {
  /**
   * Contrato del servicio. Al arrancar, toda ruta del contrato debe tener un handler y todo
   * código de error que declara una ruta debe estar en el catálogo.
   */
  readonly contract: ServiceContract;
  /**
   * Catálogos de error del servicio. Se suman a `platformErrorCatalog`, `authErrorCatalog` y
   * `rateLimitErrorCatalog`, que el módulo siempre registra.
   */
  readonly catalogs?: readonly (readonly ErrorCatalogEntry[])[];
  /** Audiencia que debe nombrar el claim `aud` de un access token. Por defecto `TokenAudience.Api`. */
  readonly audience?: TokenAudience;
  /**
   * Valida la respuesta de cada ruta contra su esquema (`ContractOutputInterceptor`). Por
   * defecto, `true` salvo en producción.
   */
  readonly validateOutput?: boolean;
}
