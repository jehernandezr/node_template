import type { RouteDefinition } from '@contracts/platform';
import type { EndpointOptions, ResourceOptions } from './endpoint-options.js';

/** Una ruta del contrato atendida por un handler de un controller. */
export interface RegisteredEndpoint {
  readonly route: RouteDefinition;
  readonly options: EndpointOptions;
  readonly resource: {
    readonly name: string;
    readonly options: ResourceOptions;
  };
  readonly controller: string;
  readonly handler: string;
}
