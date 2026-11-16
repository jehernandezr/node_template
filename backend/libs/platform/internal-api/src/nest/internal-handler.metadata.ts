import { SetMetadata } from '@nestjs/common';
import type { OperationDefinition } from '@contracts/platform';

/** Metadatos de `@InternalHandler`: qué operación atiende un método. */
export class InternalHandlerMetadata {
  static readonly KEY = Symbol.for('platform.internal-api.handler');

  /** Marca un método como el handler de `operation`. */
  static decorator(operation: OperationDefinition): MethodDecorator {
    return SetMetadata(InternalHandlerMetadata.KEY, operation);
  }

  /** Operación que atiende `method`, o `undefined` si no lleva `@InternalHandler`. */
  static read(method: unknown): OperationDefinition | undefined {
    if (typeof method !== 'function') {
      return undefined;
    }
    return Reflect.getMetadata(InternalHandlerMetadata.KEY, method) as
      OperationDefinition | undefined;
  }
}
