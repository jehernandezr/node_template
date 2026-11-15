import type { OperationDefinition } from '@contracts/platform';
import type {
  HandlerInputOf,
  OperationOutputOf,
} from '../contract/operation-io.type.js';
import type { CallMeta } from '../transport/call-meta.js';
import type { HandlerResult } from './handler-result.js';

/**
 * Handler de una operación. Devuelve un `HandlerResult` o lanza: un error
 * lanzado se clasifica con `FailureClassifier` (un `DomainError` es un error de
 * negocio, una caída de la base es transitoria y uno desconocido es una
 * violación de protocolo).
 */
export abstract class OperationHandler<
  S extends OperationDefinition = OperationDefinition,
> {
  abstract handle(
    input: HandlerInputOf<S>,
    context: CallMeta,
  ): Promise<HandlerResult<OperationOutputOf<S>>>;
}
