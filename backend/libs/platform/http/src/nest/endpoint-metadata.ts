import type { RouteDefinition } from '@contracts/platform';
import type { EndpointOptions } from '../endpoint-options.js';

/** Metadato que `@Endpoint` guarda en el método del controller. */
export interface EndpointMetadata {
  readonly route: RouteDefinition;
  readonly options: EndpointOptions;
}
