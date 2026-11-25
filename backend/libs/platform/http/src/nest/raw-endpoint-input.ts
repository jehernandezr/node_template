import type { RouteDefinition } from '@contracts/platform';
import type { EndpointOptions } from '../endpoint-options.js';
import type { HttpExchange } from '../http-exchange.js';

/**
 * What `@Input()` delivers to `ContractInputPipe`: the raw parts of the request and the route that
 * validates them. The pipe converts them into the contract's validated input.
 */
export interface RawEndpointInput {
  readonly route: RouteDefinition;
  readonly options: EndpointOptions;
  /** Route parameters, always text. */
  readonly params: Readonly<Record<string, string>>;
  /** Raw query as the server delivers it. */
  readonly query: Readonly<Record<string, unknown>>;
  readonly body: unknown;
  readonly exchange: HttpExchange;
}
