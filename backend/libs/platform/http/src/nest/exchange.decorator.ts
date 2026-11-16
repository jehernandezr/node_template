import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { HttpExchange } from '../http-exchange.js';
import type { HttpResponseView } from '../http-response-view.js';
import { ExpressHttpExchange } from './express-http-exchange.js';
import type { PipelineRequest } from './pipeline-request.js';

/** Arma el `HttpExchange` de la petición en curso. */
export class ExchangeFactory {
  static create(_data: unknown, context: ExecutionContext): HttpExchange {
    const http = context.switchToHttp();
    return new ExpressHttpExchange(
      http.getRequest<PipelineRequest>(),
      http.getResponse<HttpResponseView>(),
    );
  }
}

/** `@Exchange()`: el `HttpExchange` con el cliente y la cookie de sesión. */
export const Exchange = createParamDecorator(ExchangeFactory.create);
