import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Actor } from '@platform/auth';
import { HttpRequestKey } from './http-metadata-key.enum.js';
import type { PipelineRequest } from './pipeline-request.js';

/** Reads the actor left by `EndpointGuard`. */
export class CurrentActorFactory {
  /**
   * Reads the authenticated actor of the request.
   * @param _data Unused decorator data.
   * @param context Execution context.
   * @returns The actor, or `undefined`.
   */
  static create(_data: unknown, context: ExecutionContext): Actor | undefined {
    const request = context.switchToHttp().getRequest<PipelineRequest>();
    return request[HttpRequestKey.Call]?.actor;
  }
}

/**
 * `@CurrentActor()`: the authenticated `Actor`, or `undefined` on a public route. It is named this way so as
 * not to clash with the `Actor` type.
 */
export const CurrentActor = createParamDecorator(CurrentActorFactory.create);
