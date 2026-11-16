import type { Actor } from '@platform/auth';
import type { RouteDefinition } from '@contracts/platform';
import type { EndpointOptions, ResourceOptions } from './endpoint-options.js';

/** Resultado de `EndpointGuard` para una petición: la ruta atendida y quién la hace. */
export interface EndpointCall {
  readonly route: RouteDefinition;
  readonly options: EndpointOptions;
  readonly resource: ResourceOptions;
  /** Ausente en una ruta pública. */
  readonly actor?: Actor;
  /** Versión de la API que se aplica a esta petición. */
  readonly apiVersion: string;
}
