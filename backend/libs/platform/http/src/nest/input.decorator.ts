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

/** Builds the `RawEndpointInput` of the current request. */
export class RawEndpointInputFactory {
  private static readonly reflector = new Reflector();

  /**
   * Reads the raw input of the request: params, query and body.
   * @param _data Unused decorator data.
   * @param context Execution context.
   * @returns The raw input.
   */
  static create(_data: unknown, context: ExecutionContext): RawEndpointInput {
    const http = context.switchToHttp();
    const request = http.getRequest<PipelineRequest>();
    const response = http.getResponse<HttpResponseView>();
    const metadata = RawEndpointInputFactory.reflector.get<
      EndpointMetadata | undefined
    >(HttpMetadataKey.Endpoint, context.getHandler());
    if (metadata === undefined) {
      throw new Error('@Input() is only used on a method with @Endpoint');
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
  /**
   * Validated input: route parameters, query (with `decodeQuery`) or body, depending on the method.
   * @returns The parameter decorator.
   */
  static apply(): ParameterDecorator {
    const pipe: Type<PipeTransform> = ContractInputPipe;
    return RawInputParam(pipe);
  }
}

/** `@Input()` decorator for the parameter with the route's validated input. */
export const Input = InputDecorator.apply;
