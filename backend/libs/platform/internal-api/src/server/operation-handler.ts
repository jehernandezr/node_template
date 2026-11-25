import type { OperationDefinition } from '@contracts/platform';
import type {
  HandlerInputOf,
  OperationOutputOf,
} from '../contract/operation-io.type.js';
import type { CallMeta } from '../transport/call-meta.js';
import type { HandlerResult } from './handler-result.js';

/**
 * Handler of an operation. It returns a `HandlerResult` or throws: a thrown
 * error is classified with `FailureClassifier` (a `DomainError` is a business
 * error, a database outage is transient and an unknown one is a
 * protocol violation).
 */
export abstract class OperationHandler<
  S extends OperationDefinition = OperationDefinition,
> {
  abstract handle(
    input: HandlerInputOf<S>,
    context: CallMeta,
  ): Promise<HandlerResult<OperationOutputOf<S>>>;
}
