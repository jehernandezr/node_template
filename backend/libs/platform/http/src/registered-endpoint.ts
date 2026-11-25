import type { RouteDefinition } from '@contracts/platform';
import type { EndpointOptions, ResourceOptions } from './endpoint-options.js';

/** A contract route served by a controller handler. */
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
