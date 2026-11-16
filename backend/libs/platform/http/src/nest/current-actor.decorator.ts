import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Actor } from '@platform/auth';
import { HttpRequestKey } from './http-metadata-key.enum.js';
import type { PipelineRequest } from './pipeline-request.js';

/** Lee el actor que dejó `EndpointGuard`. */
export class CurrentActorFactory {
  static create(_data: unknown, context: ExecutionContext): Actor | undefined {
    const request = context.switchToHttp().getRequest<PipelineRequest>();
    return request[HttpRequestKey.Call]?.actor;
  }
}

/**
 * `@CurrentActor()`: el `Actor` autenticado, o `undefined` en una ruta pública. Se llama así para
 * no chocar con el tipo `Actor`.
 */
export const CurrentActor = createParamDecorator(CurrentActorFactory.create);
