/** Reasons the internal API puts in results that are not a success. */
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
  /** The unit of work failed to commit: the effects may or may not be stored. */
  CommitFailed = 'commit-failed',
  /** The server rejected the call signature. */
  Unauthenticated = 'unauthenticated',
  /** The HTTP response does not have the protocol shape. */
  InvalidResponse = 'invalid-response',
  /** The server responded with an HTTP status the protocol does not allow. */
  UnexpectedStatus = 'unexpected-status',
}
