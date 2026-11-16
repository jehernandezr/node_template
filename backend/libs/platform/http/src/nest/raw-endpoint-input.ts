import type { RouteDefinition } from '@contracts/platform';
import type { EndpointOptions } from '../endpoint-options.js';
import type { HttpExchange } from '../http-exchange.js';

/**
 * Lo que `@Input()` entrega a `ContractInputPipe`: las partes crudas de la petición y la ruta que
 * las valida. El pipe las convierte en la entrada validada del contrato.
 */
export interface RawEndpointInput {
  readonly route: RouteDefinition;
  readonly options: EndpointOptions;
  /** Parámetros de ruta, siempre texto. */
  readonly params: Readonly<Record<string, string>>;
  /** Query cruda tal como la entrega el servidor. */
  readonly query: Readonly<Record<string, unknown>>;
  readonly body: unknown;
  readonly exchange: HttpExchange;
}
