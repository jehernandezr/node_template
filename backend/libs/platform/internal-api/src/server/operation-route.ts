import type { OperationDefinition } from '@contracts/platform';
import type { OperationDescriptor } from '../contract/operation-descriptor.js';
import type { OperationHandler } from './operation-handler.js';

/** Operación con su handler y los códigos de negocio que puede devolver. */
export class OperationRoute {
  constructor(
    readonly descriptor: OperationDescriptor,
    readonly handler: OperationHandler,
    readonly allowedCodes: ReadonlySet<string>,
  ) {}

  /** Une un descriptor ya resuelto con el handler que lo atiende. */
  static bind<S extends OperationDefinition>(
    descriptor: OperationDescriptor,
    handler: OperationHandler<S>,
  ): OperationRoute {
    // El router solo entrega al handler entrada parseada con `descriptor.input`, el esquema de `S`.
    return new OperationRoute(
      descriptor,
      handler as OperationHandler,
      descriptor.metadata.allowedErrorCodes(),
    );
  }
}
