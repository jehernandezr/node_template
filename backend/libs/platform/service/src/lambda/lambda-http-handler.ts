import type { ApiGatewayHttpEvent } from './api-gateway-http-event.js';
import type { ApiGatewayHttpResponse } from './api-gateway-http-response.js';

/** Lo que exporta `lambda.ts` como `handler`: atiende un evento de la API HTTP. */
export type LambdaHttpHandler = (
  event: ApiGatewayHttpEvent,
) => Promise<ApiGatewayHttpResponse>;
