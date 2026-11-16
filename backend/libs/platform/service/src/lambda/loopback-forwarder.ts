import type { ApiGatewayHttpEvent } from './api-gateway-http-event.js';
import type { ApiGatewayHttpResponse } from './api-gateway-http-response.js';
import { ApiGatewayRequestMapper } from './api-gateway-request-mapper.js';
import { ApiGatewayResponseMapper } from './api-gateway-response-mapper.js';

/**
 * Reenvía cada evento al servicio HTTP que corre en el mismo contenedor. Así la
 * aplicación Nest no cambia entre un proceso y una función Lambda. Los errores
 * de red se propagan para que Lambda los reporte como fallo de invocación.
 */
export class LoopbackForwarder {
  constructor(
    private readonly baseUrl: string,
    private readonly requests: ApiGatewayRequestMapper,
    private readonly responses: ApiGatewayResponseMapper,
    private readonly fetcher: typeof fetch,
  ) {}

  async forward(event: ApiGatewayHttpEvent): Promise<ApiGatewayHttpResponse> {
    const { url, init } = this.requests.toRequest(event, this.baseUrl);
    const response = await this.fetcher(url, init);
    return this.responses.fromResponse(response);
  }
}
