import type { ClientInfo } from '../client-info.js';
import type { EndpointCall } from '../endpoint-call.js';
import type { HttpRequestView } from '../http-request-view.js';
import { HttpRequestKey } from './http-metadata-key.enum.js';

/**
 * The request as seen by the middlewares, the guard, the interceptors and the decorators: the minimal
 * view plus what the pipeline itself writes on it. This way nobody reads those properties with a
 * cast.
 */
export interface PipelineRequest extends HttpRequestView {
  /** Written by `OriginPolicyMiddleware`. */
  [HttpRequestKey.ClientInfo]?: ClientInfo;
  /** Written by `EndpointGuard`; absent in a controller without `@Endpoint`. */
  [HttpRequestKey.Call]?: EndpointCall;
}
