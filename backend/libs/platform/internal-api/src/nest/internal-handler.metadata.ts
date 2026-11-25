import { SetMetadata } from '@nestjs/common';
import type { OperationDefinition } from '@contracts/platform';

/** Metadata of `@InternalHandler`: which operation a method handles. */
export class InternalHandlerMetadata {
  static readonly KEY = Symbol.for('platform.internal-api.handler');

  /** Marks a method as the handler of `operation`. */
  static decorator(operation: OperationDefinition): MethodDecorator {
    return SetMetadata(InternalHandlerMetadata.KEY, operation);
  }

  /** Returns the operation `method` handles, or `undefined` if it has no `@InternalHandler`. */
  static read(method: unknown): OperationDefinition | undefined {
    if (typeof method !== 'function') {
      return undefined;
    }
    return Reflect.getMetadata(InternalHandlerMetadata.KEY, method) as
      OperationDefinition | undefined;
  }
}
