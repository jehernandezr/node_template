import { CallOutcomeKind, type CallOutcome } from '@platform/primitives';

/**
 * Discriminant of an operation outcome.
 * @deprecated Use `CallOutcomeKind` from `@platform/primitives`; the values are the same.
 */
export const ResultKind = CallOutcomeKind;
/** @deprecated Use `CallOutcomeKind` from `@platform/primitives`. */
export type ResultKind = CallOutcomeKind;

/**
 * Outcome of an operation call.
 * @deprecated Use `CallOutcome` from `@platform/primitives`.
 */
export type OperationResult<T> = CallOutcome<T>;

/** Reasons the internal API puts in non-success outcomes. */
export enum InternalApiReason {
  InvalidInput = 'invalid-input',
  InvalidOutput = 'invalid-output',
  UnknownOperation = 'unknown-operation',
  UndeclaredError = 'undeclared-error',
  IdempotencyKeyReuse = 'idempotency-key-reuse',
  InvalidIdempotencyKey = 'invalid-idempotency-key',
  PayloadTooLarge = 'payload-too-large',
  InvalidHandlerResult = 'invalid-handler-result',
  DeadlineExceeded = 'deadline-exceeded',
  InProgress = 'in-progress',
  Timeout = 'timeout',
  Cancelled = 'cancelled',
  StaleClaim = 'stale-claim',
}
