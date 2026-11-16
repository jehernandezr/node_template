import type { ClientInfo } from '../client-info.js';
import type { EndpointCall } from '../endpoint-call.js';
import type { HttpRequestView } from '../http-request-view.js';
import { HttpRequestKey } from './http-metadata-key.enum.js';

/**
 * La petición como la ven los middlewares, el guard, los interceptores y los decoradores: la vista
 * mínima más lo que el propio pipeline deja escrito en ella. Así nadie lee esas propiedades con un
 * cast.
 */
export interface PipelineRequest extends HttpRequestView {
  /** Lo escribe `OriginPolicyMiddleware`. */
  [HttpRequestKey.ClientInfo]?: ClientInfo;
  /** Lo escribe `EndpointGuard`; ausente en un controller sin `@Endpoint`. */
  [HttpRequestKey.Call]?: EndpointCall;
}
