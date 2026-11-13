import type { FieldError } from '@contracts/platform';
import {
  CallOutcome,
  CallOutcomeKind,
  type BusinessErrorOutcome,
} from '@platform/primitives';
import { INVALID_INPUT_CODE } from './contract.js';

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
  /** The unit of work failed while committing: the effects may or may not be stored. */
  CommitFailed = 'commit-failed',
}

/**
 * Input that breaks the contract: business error
 * `PLATFORM.VALIDATION.INVALID_INPUT` with `details.fieldErrors`. The client
 * returns it before any network call and the router returns the same outcome,
 * so the caller handles the case one way. It is never stored.
 */
export interface InputViolationOutcome extends BusinessErrorOutcome {
  readonly details: { readonly fieldErrors: readonly FieldError[] };
}

/** Outcome of an input that breaks the contract, on both ends of the call. */
export function invalidInputOutcome(
  operationId: string,
  fieldErrors: readonly FieldError[],
): InputViolationOutcome {
  return {
    ...CallOutcome.businessError(INVALID_INPUT_CODE, {
      message: `Invalid input for "${operationId}"`,
    }),
    details: { fieldErrors },
  };
}
