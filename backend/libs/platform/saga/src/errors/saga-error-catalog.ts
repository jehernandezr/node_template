import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { SagaErrorCode } from './saga-error-code.enum.js';

/**
 * Catalog of the `@platform/saga` codes. The codes are internal: the
 * central catalog does not declare them.
 */
export const sagaErrorCatalog = defineErrorCatalog(SagaErrorCode, {
  [SagaErrorCode.NotFound]: ErrorSpecs.internal(
    404,
    false,
    'The saga does not exist.',
  ),
  [SagaErrorCode.DuplicateSaga]: ErrorSpecs.internal(
    409,
    false,
    'A saga with that identifier already exists.',
  ),
  [SagaErrorCode.UnknownDefinition]: ErrorSpecs.internal(
    500,
    false,
    'The saga definition is not registered.',
  ),
  [SagaErrorCode.InvalidDefinition]: ErrorSpecs.internal(
    500,
    false,
    'The saga definition is invalid.',
  ),
  [SagaErrorCode.InvalidConfiguration]: ErrorSpecs.internal(
    500,
    false,
    'The saga orchestrator configuration is invalid.',
  ),
  [SagaErrorCode.InvalidState]: ErrorSpecs.internal(
    409,
    false,
    'The saga is not in a state that allows the action.',
  ),
  [SagaErrorCode.MissingCompensation]: ErrorSpecs.internal(
    500,
    false,
    'A saga step modifies data and does not declare a compensation.',
  ),
  [SagaErrorCode.ConcurrentModification]: ErrorSpecs.internal(
    409,
    true,
    'Another process modified the saga at the same time.',
  ),
  [SagaErrorCode.LeaseNotAcquired]: ErrorSpecs.internal(
    409,
    true,
    'Another process holds the saga turn.',
  ),
  [SagaErrorCode.LeaseLost]: ErrorSpecs.internal(
    409,
    true,
    'The process lost the saga turn during execution.',
  ),
  [SagaErrorCode.TransientFailure]: ErrorSpecs.internal(
    503,
    true,
    'A saga step failed transiently.',
  ),
  [SagaErrorCode.ProtocolViolation]: ErrorSpecs.internal(
    500,
    false,
    'A saga step returned a response outside its contract.',
  ),
  [SagaErrorCode.UncertainOutcome]: ErrorSpecs.internal(
    504,
    true,
    'It is unknown whether a saga step was applied; it is retried with the same key.',
  ),
  [SagaErrorCode.StateUpdateFailed]: ErrorSpecs.internal(
    500,
    true,
    'The saga state could not be saved.',
  ),
  [SagaErrorCode.InputBuildFailed]: ErrorSpecs.internal(
    500,
    false,
    'The input of a saga step could not be built.',
  ),
  [SagaErrorCode.IdempotencyKeyConflict]: ErrorSpecs.internal(
    409,
    false,
    'The idempotency key was already used with another input.',
  ),
  [SagaErrorCode.DeadlineExceeded]: ErrorSpecs.internal(
    504,
    false,
    'The saga exceeded its maximum deadline.',
  ),
});
