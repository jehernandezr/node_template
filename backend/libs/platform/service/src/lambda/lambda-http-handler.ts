import type { ApiGatewayHttpEvent } from './api-gateway-http-event.js';
import type { ApiGatewayHttpResponse } from './api-gateway-http-response.js';

/** What `lambda.ts` exports as `handler`: handles an HTTP API event. */
export type LambdaHttpHandler = (
  event: ApiGatewayHttpEvent,
) => Promise<ApiGatewayHttpResponse>;
