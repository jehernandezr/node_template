/** Discriminant of an operation result. */
export enum ResultKind {
  Success = 'success',
  BusinessError = 'business-error',
  TransientFailure = 'transient-failure',
  ProtocolViolation = 'protocol-violation',
}

/**
 * Outcome of an operation call. Callers branch on `kind`.
 * - Success: validated output.
 * - BusinessError: a code declared by the contract (or the implicit INVALID_INPUT code).
 * - TransientFailure: retryable for idempotent operations.
 * - ProtocolViolation: a contract or implementation fault. Never retried, never stored.
 */
export type OperationResult<T> =
  | { readonly kind: ResultKind.Success; readonly value: T }
  | {
      readonly kind: ResultKind.BusinessError;
      readonly code: string;
      readonly message?: string;
      readonly details?: Record<string, unknown>;
    }
  | {
      readonly kind: ResultKind.TransientFailure;
      readonly reason: string;
      readonly cause?: unknown;
    }
  | {
      readonly kind: ResultKind.ProtocolViolation;
      readonly reason: string;
      readonly code?: string;
    };
