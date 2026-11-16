import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { HandlerResult } from '../server/handler-result.js';
import { OperationHandler } from '../server/operation-handler.js';
import type { CallMeta } from '../transport/call-meta.js';

/** Adapta un método decorado con `@InternalHandler` al puerto `OperationHandler`. */
export class BoundMethodHandler extends OperationHandler {
  private readonly method: (
    input: unknown,
    context: CallMeta,
  ) => Promise<HandlerResult<unknown>>;

  constructor(
    private readonly instance: object,
    methodName: string,
  ) {
    super();
    const candidate = (instance as Record<string, unknown>)[methodName];
    if (typeof candidate !== 'function') {
      throw new InternalApiError(
        InternalApiErrorCode.InvalidConfiguration,
        `"${methodName}" is not a method of the handler provider`,
      );
    }
    this.method = candidate as BoundMethodHandler['method'];
  }

  /** Llama a `instance[methodName](input, context)` y devuelve lo que ese método devuelve. */
  override handle(
    input: unknown,
    context: CallMeta,
  ): Promise<HandlerResult<unknown>> {
    return this.method.call(this.instance, input, context);
  }
}
