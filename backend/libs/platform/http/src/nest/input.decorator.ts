import {
  createParamDecorator,
  type ExecutionContext,
  type PipeTransform,
  type Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ContractInputPipe } from './contract-input.pipe.js';
import type { EndpointMetadata } from './endpoint-metadata.js';
import { ExpressHttpExchange } from './express-http-exchange.js';
import { HttpMetadataKey } from './http-metadata-key.enum.js';
import type { HttpResponseView } from '../http-response-view.js';
import type { PipelineRequest } from './pipeline-request.js';
import type { RawEndpointInput } from './raw-endpoint-input.js';

/** Arma el `RawEndpointInput` de la petición en curso. */
export class RawEndpointInputFactory {
  private static readonly reflector = new Reflector();

  static create(_data: unknown, context: ExecutionContext): RawEndpointInput {
    const http = context.switchToHttp();
    const request = http.getRequest<PipelineRequest>();
    const response = http.getResponse<HttpResponseView>();
    const metadata = RawEndpointInputFactory.reflector.get<
      EndpointMetadata | undefined
    >(HttpMetadataKey.Endpoint, context.getHandler());
    if (metadata === undefined) {
      throw new Error('@Input() solo se usa en un método con @Endpoint');
    }
    return {
      route: metadata.route,
      options: metadata.options,
      params: request.params,
      query: request.query,
      body: request.body,
      exchange: new ExpressHttpExchange(request, response),
    };
  }
}

const RawInputParam = createParamDecorator(RawEndpointInputFactory.create);

/** Escribe `@Input()`. */
export class InputDecorator {
  /** Entrada validada: parámetros de ruta, query (con `decodeQuery`) o cuerpo, según el método. */
  static apply(): ParameterDecorator {
    const pipe: Type<PipeTransform> = ContractInputPipe;
    return RawInputParam(pipe);
  }
}

/** Decorador `@Input()` del parámetro con la entrada validada de la ruta. */
export const Input = InputDecorator.apply;
