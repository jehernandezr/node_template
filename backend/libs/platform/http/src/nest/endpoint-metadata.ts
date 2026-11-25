import type { RouteDefinition } from '@contracts/platform';
import type { EndpointOptions } from '../endpoint-options.js';

/** Metadata that `@Endpoint` stores on the controller method. */
export interface EndpointMetadata {
  readonly route: RouteDefinition;
  readonly options: EndpointOptions;
}
