import type { ApiGatewayHttpEvent } from './api-gateway-http-event.js';
import type { ApiGatewayHttpResponse } from './api-gateway-http-response.js';
import { ApiGatewayRequestMapper } from './api-gateway-request-mapper.js';
import { ApiGatewayResponseMapper } from './api-gateway-response-mapper.js';

/**
 * Forwards each event to the HTTP service running in the same container. That way the
 * Nest application does not change between a process and a Lambda function. Network
 * errors are propagated so Lambda reports them as an invocation failure.
 */
export class LoopbackForwarder {
  constructor(
    private readonly baseUrl: string,
    private readonly requests: ApiGatewayRequestMapper,
    private readonly responses: ApiGatewayResponseMapper,
    private readonly fetcher: typeof fetch,
  ) {}

  /**
   * Forwards an API Gateway event to the in-process HTTP server and maps its answer back.
   * @param event API Gateway event.
   * @returns The API Gateway response.
   */
  async forward(event: ApiGatewayHttpEvent): Promise<ApiGatewayHttpResponse> {
    const { url, init } = this.requests.toRequest(event, this.baseUrl);
    const response = await this.fetcher(url, init);
    return this.responses.fromResponse(response);
  }
}
