import { PlatformErrorCode } from '@contracts/platform';
import { FailureKind, PlatformError } from '@platform/kernel';

/** Error codes of the internal API, declared once in `@contracts/platform`. */
export type InternalApiErrorCode =
  | PlatformErrorCode.InternalApiInvalidOutput
  | PlatformErrorCode.InternalApiUnknownOperation
  | PlatformErrorCode.InternalApiDuplicateOperation
  | PlatformErrorCode.InternalApiMissingCompensation
  | PlatformErrorCode.InternalApiMissingHandler
  | PlatformErrorCode.InternalApiNonJsonSafeSchema
  /** The value given as an operation is not a `defineOperation` descriptor. */
  | PlatformErrorCode.InternalApiInvalidOperation
  /** Missing, empty or oversized idempotency key or tenant id. */
  | PlatformErrorCode.InternalApiInvalidIdempotencyKey
  /** The same idempotency key was reused with a different input. */
  | PlatformErrorCode.InternalApiIdempotencyKeyReuse
  /** The serialized input or output exceeds the configured limit. */
  | PlatformErrorCode.InternalApiPayloadTooLarge
  /** A handler returned something that is not a `CallOutcome`. */
  | PlatformErrorCode.InternalApiInvalidHandlerResult
  /** An operation can take longer than the registry allows for one call, retries included. */
  | PlatformErrorCode.InternalApiCallBudgetExceeded;

/**
 * Raised for contract violations found while defining or registering
 * operations. Calls never throw it: the client and the router report contract
 * violations as a `CallOutcome`.
 */
export class InternalApiError extends PlatformError {
  override readonly code: InternalApiErrorCode;
  /** A broken contract is a protocol violation for `classifyFailure`. */
  readonly failureKind = FailureKind.ProtocolViolation;

  constructor(
    code: InternalApiErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message, details === undefined ? {} : { details });
    this.code = code;
  }
}
