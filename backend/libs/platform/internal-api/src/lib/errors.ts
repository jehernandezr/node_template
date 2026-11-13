import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';
import { FailureKind } from '@platform/primitives';

/**
 * Error codes of the internal API, format `PLATFORM.INTERNAL_API.<ERROR>`.
 * Each value is the `PlatformErrorCode` of the catalog, so the code is
 * declared once in `@contracts/platform`.
 */
export const InternalApiErrorCode = {
  /**
   * @deprecated Calls answer an invalid input with the business error
   * `PlatformErrorCode.ValidationInvalidInput`; the code stays in the catalog.
   */
  InvalidInput: PlatformErrorCode.InternalApiInvalidInput,
  InvalidOutput: PlatformErrorCode.InternalApiInvalidOutput,
  UnknownOperation: PlatformErrorCode.InternalApiUnknownOperation,
  DuplicateOperation: PlatformErrorCode.InternalApiDuplicateOperation,
  MissingCompensation: PlatformErrorCode.InternalApiMissingCompensation,
  MissingHandler: PlatformErrorCode.InternalApiMissingHandler,
  Timeout: PlatformErrorCode.InternalApiTimeout,
  NonJsonSafeSchema: PlatformErrorCode.InternalApiNonJsonSafeSchema,
  /** The value given as an operation is neither an `@Operation` class nor a `defineOperation` descriptor. */
  InvalidOperation: PlatformErrorCode.InternalApiInvalidOperation,
  /** Missing, empty or oversized idempotency key or tenant id. */
  InvalidIdempotencyKey: PlatformErrorCode.InternalApiInvalidIdempotencyKey,
  /** The same idempotency key was reused with a different input. */
  IdempotencyKeyReuse: PlatformErrorCode.InternalApiIdempotencyKeyReuse,
  /** The serialized input or output exceeds the configured limit. */
  PayloadTooLarge: PlatformErrorCode.InternalApiPayloadTooLarge,
  /** A handler returned something that is not a `CallOutcome`. */
  InvalidHandlerResult: PlatformErrorCode.InternalApiInvalidHandlerResult,
  /** An operation can take longer than the registry allows for one call, retries included. */
  CallBudgetExceeded: PlatformErrorCode.InternalApiCallBudgetExceeded,
} as const;

/** One of the {@link InternalApiErrorCode} values. */
export type InternalApiErrorCode =
  (typeof InternalApiErrorCode)[keyof typeof InternalApiErrorCode];

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
