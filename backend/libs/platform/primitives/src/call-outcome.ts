/** Discriminant of `CallOutcome`. */
export enum CallOutcomeKind {
  Success = 'success',
  BusinessError = 'business-error',
  ProtocolViolation = 'protocol-violation',
  TransientFailure = 'transient-failure',
  Uncertain = 'uncertain',
}

/** The call finished and returned a valid value. */
export interface SuccessOutcome<T> {
  readonly kind: CallOutcomeKind.Success;
  readonly value: T;
}

/** The call finished with a business error declared by the contract. It is final. */
export interface BusinessErrorOutcome {
  readonly kind: CallOutcomeKind.BusinessError;
  readonly code: string;
  readonly message?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Broken contract or implementation failure. Never retried or stored. */
export interface ProtocolViolationOutcome {
  readonly kind: CallOutcomeKind.ProtocolViolation;
  readonly reason: string;
  readonly code?: string;
}

/** The call produced no effects and retrying it may work. */
export interface TransientFailureOutcome {
  readonly kind: CallOutcomeKind.TransientFailure;
  readonly reason: string;
  /** Suggested wait before retrying, in milliseconds. */
  readonly retryAfterMs?: number;
  readonly cause?: unknown;
}

/**
 * It is unknown whether the call applied its effects (timeout or cancellation
 * after sending). It is retried only if the operation is idempotent; otherwise,
 * the state is queried or compensated.
 */
export interface UncertainOutcome {
  readonly kind: CallOutcomeKind.Uncertain;
  readonly reason: string;
  readonly cause?: unknown;
}

/** Result of a call between processes. The caller decides based on `kind`. */
export type CallOutcome<T> =
  | SuccessOutcome<T>
  | BusinessErrorOutcome
  | ProtocolViolationOutcome
  | TransientFailureOutcome
  | UncertainOutcome;

/** Final result: it no longer changes when the call is repeated and can be stored for idempotency. */
export type FinalOutcome<T> = SuccessOutcome<T> | BusinessErrorOutcome;

function success<T>(value: T): SuccessOutcome<T> {
  return { kind: CallOutcomeKind.Success, value };
}

function businessError(
  code: string,
  options: {
    readonly message?: string;
    readonly details?: Readonly<Record<string, unknown>>;
  } = {},
): BusinessErrorOutcome {
  return { kind: CallOutcomeKind.BusinessError, code, ...options };
}

function protocolViolation(
  reason: string,
  code?: string,
): ProtocolViolationOutcome {
  return code === undefined
    ? { kind: CallOutcomeKind.ProtocolViolation, reason }
    : { kind: CallOutcomeKind.ProtocolViolation, reason, code };
}

function transientFailure(
  reason: string,
  options: { readonly retryAfterMs?: number; readonly cause?: unknown } = {},
): TransientFailureOutcome {
  return { kind: CallOutcomeKind.TransientFailure, reason, ...options };
}

function uncertain(reason: string, cause?: unknown): UncertainOutcome {
  return cause === undefined
    ? { kind: CallOutcomeKind.Uncertain, reason }
    : { kind: CallOutcomeKind.Uncertain, reason, cause };
}

/** Builders of `CallOutcome`. */
export const CallOutcome = {
  success,
  businessError,
  protocolViolation,
  transientFailure,
  uncertain,
} as const;

/** Whether the call returned a value. */
export function isSuccess<T>(
  outcome: CallOutcome<T>,
): outcome is SuccessOutcome<T> {
  return outcome.kind === CallOutcomeKind.Success;
}

/** Whether the result is final (success or business error) and can be stored. */
export function isFinalOutcome<T>(
  outcome: CallOutcome<T>,
): outcome is FinalOutcome<T> {
  return (
    outcome.kind === CallOutcomeKind.Success ||
    outcome.kind === CallOutcomeKind.BusinessError
  );
}
