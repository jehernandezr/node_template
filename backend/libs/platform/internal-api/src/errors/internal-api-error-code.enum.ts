/** Error codes that `@platform/internal-api` emits. */
export enum InternalApiErrorCode {
  InvalidOutput = 'PLATFORM.INTERNAL_API.INVALID_OUTPUT',
  UnknownOperation = 'PLATFORM.INTERNAL_API.UNKNOWN_OPERATION',
  DuplicateOperation = 'PLATFORM.INTERNAL_API.DUPLICATE_OPERATION',
  MissingCompensation = 'PLATFORM.INTERNAL_API.MISSING_COMPENSATION',
  MissingHandler = 'PLATFORM.INTERNAL_API.MISSING_HANDLER',
  NonJsonSafeSchema = 'PLATFORM.INTERNAL_API.NON_JSON_SAFE_SCHEMA',
  /** The value received as an operation is not a `defineOperation` descriptor. */
  InvalidOperation = 'PLATFORM.INTERNAL_API.INVALID_OPERATION',
  /** Idempotency key or tenant missing, empty or too long. */
  InvalidIdempotencyKey = 'PLATFORM.INTERNAL_API.INVALID_IDEMPOTENCY_KEY',
  /** The step compensation already ran: a late send of the step does not apply its effect. */
  StepCompensated = 'PLATFORM.INTERNAL_API.STEP_COMPENSATED',
  /** The same key was reused with a different input. */
  IdempotencyKeyReuse = 'PLATFORM.INTERNAL_API.IDEMPOTENCY_KEY_REUSE',
  /** The serialized input or output exceeds the limit. */
  PayloadTooLarge = 'PLATFORM.INTERNAL_API.PAYLOAD_TOO_LARGE',
  /** A handler returned something that is not a `CallOutcome`. */
  InvalidHandlerResult = 'PLATFORM.INTERNAL_API.INVALID_HANDLER_RESULT',
  /** An operation can take longer than the registry allows per call, retries included. */
  CallBudgetExceeded = 'PLATFORM.INTERNAL_API.CALL_BUDGET_EXCEEDED',
  /** The call signature is missing, does not match or is outside the time window. */
  Unauthenticated = 'PLATFORM.INTERNAL_API.UNAUTHENTICATED',
  /** The body or the headers of the call do not have the protocol shape. */
  InvalidRequest = 'PLATFORM.INTERNAL_API.INVALID_REQUEST',
  /** The transport or signing options are not valid. */
  InvalidConfiguration = 'PLATFORM.INTERNAL_API.INVALID_CONFIGURATION',
  /** No base URL is configured for the service that owns the operation. */
  UnknownService = 'PLATFORM.INTERNAL_API.UNKNOWN_SERVICE',
}
