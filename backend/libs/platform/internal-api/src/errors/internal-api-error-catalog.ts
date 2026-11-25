import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { InternalApiErrorCode } from './internal-api-error-code.enum.js';

/** Catalog of the `@platform/internal-api` codes; none of them reaches the client. */
export const internalApiErrorCatalog = defineErrorCatalog(
  InternalApiErrorCode,
  {
    [InternalApiErrorCode.InvalidOutput]: ErrorSpecs.internal(
      502,
      false,
      'The output of an internal operation does not match its contract.',
    ),
    [InternalApiErrorCode.UnknownOperation]: ErrorSpecs.internal(
      404,
      false,
      'The internal operation is not registered.',
    ),
    [InternalApiErrorCode.DuplicateOperation]: ErrorSpecs.internal(
      500,
      false,
      'Two internal operations use the same identifier.',
    ),
    [InternalApiErrorCode.MissingCompensation]: ErrorSpecs.internal(
      500,
      false,
      'An operation that modifies data does not declare its compensation.',
    ),
    [InternalApiErrorCode.MissingHandler]: ErrorSpecs.internal(
      500,
      false,
      'The internal operation has no handler.',
    ),
    [InternalApiErrorCode.NonJsonSafeSchema]: ErrorSpecs.internal(
      500,
      false,
      'The internal operation schema cannot be serialized to JSON.',
    ),
    [InternalApiErrorCode.InvalidOperation]: ErrorSpecs.internal(
      500,
      false,
      'The received value is not an operation declared with defineOperation.',
    ),
    [InternalApiErrorCode.InvalidIdempotencyKey]: ErrorSpecs.internal(
      400,
      false,
      'The idempotency key or tenant of the internal call is missing or exceeds the maximum length.',
    ),
    [InternalApiErrorCode.StepCompensated]: ErrorSpecs.internal(
      409,
      false,
      'The compensation for this saga step already ran: the step is not applied.',
    ),
    [InternalApiErrorCode.IdempotencyKeyReuse]: ErrorSpecs.internal(
      409,
      false,
      'The idempotency key of the internal operation was already used with a different input.',
    ),
    [InternalApiErrorCode.PayloadTooLarge]: ErrorSpecs.internal(
      413,
      false,
      'The input or output of the internal operation exceeds the maximum size.',
    ),
    [InternalApiErrorCode.InvalidHandlerResult]: ErrorSpecs.internal(
      500,
      false,
      'The internal operation handler returned a result that is not a CallOutcome.',
    ),
    [InternalApiErrorCode.CallBudgetExceeded]: ErrorSpecs.internal(
      500,
      false,
      'An internal operation can take longer than the budget of a call, retries included.',
    ),
    [InternalApiErrorCode.Unauthenticated]: ErrorSpecs.internal(
      401,
      false,
      'The internal call does not carry a valid signature within the time window.',
    ),
    [InternalApiErrorCode.InvalidRequest]: ErrorSpecs.internal(
      400,
      false,
      'The internal call does not have the shape the protocol requires.',
    ),
    [InternalApiErrorCode.InvalidConfiguration]: ErrorSpecs.internal(
      500,
      false,
      'The internal API transport or signing configuration is not valid.',
    ),
    [InternalApiErrorCode.UnknownService]: ErrorSpecs.internal(
      500,
      false,
      'There is no base URL configured for the service that owns the operation.',
    ),
  },
);
