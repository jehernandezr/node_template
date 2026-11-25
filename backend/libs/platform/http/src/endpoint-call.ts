import type { Actor } from '@platform/auth';
import type { RouteDefinition } from '@contracts/platform';
import type { EndpointOptions, ResourceOptions } from './endpoint-options.js';

/** Result of `EndpointGuard` for a request: the route served and who makes it. */
export interface EndpointCall {
  readonly route: RouteDefinition;
  readonly options: EndpointOptions;
  readonly resource: ResourceOptions;
  /** Absent on a public route. */
  readonly actor?: Actor;
  /** API version that applies to this request. */
  readonly apiVersion: string;
}
