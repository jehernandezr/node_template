import type { OperationDefinition } from '@contracts/platform';
import type { OperationDescriptor } from '../contract/operation-descriptor.js';
import type { OperationHandler } from './operation-handler.js';

/** Operation with its handler and the business codes it can return. */
export class OperationRoute {
  constructor(
    readonly descriptor: OperationDescriptor,
    readonly handler: OperationHandler,
    readonly allowedCodes: ReadonlySet<string>,
  ) {}

  /** Binds an already resolved descriptor to the handler that serves it. */
  static bind<S extends OperationDefinition>(
    descriptor: OperationDescriptor,
    handler: OperationHandler<S>,
  ): OperationRoute {
    // The router only hands the handler input parsed with `descriptor.input`, the schema of `S`.
    return new OperationRoute(
      descriptor,
      handler as OperationHandler,
      descriptor.metadata.allowedErrorCodes(),
    );
  }
}
