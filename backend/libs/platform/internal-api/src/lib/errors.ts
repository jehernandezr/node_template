import { PlatformError } from '@platform/kernel';
import { FailureKind } from '@platform/primitives';

/** Stable error codes of the internal API, format `PLATFORM.INTERNAL_API.<ERROR>`. */
export enum InternalApiErrorCode {
  InvalidInput = 'PLATFORM.INTERNAL_API.INVALID_INPUT',
  InvalidOutput = 'PLATFORM.INTERNAL_API.INVALID_OUTPUT',
  UnknownOperation = 'PLATFORM.INTERNAL_API.UNKNOWN_OPERATION',
  DuplicateOperation = 'PLATFORM.INTERNAL_API.DUPLICATE_OPERATION',
  MissingCompensation = 'PLATFORM.INTERNAL_API.MISSING_COMPENSATION',
  MissingHandler = 'PLATFORM.INTERNAL_API.MISSING_HANDLER',
  Timeout = 'PLATFORM.INTERNAL_API.TIMEOUT',
  NonJsonSafeSchema = 'PLATFORM.INTERNAL_API.NON_JSON_SAFE_SCHEMA',
  /** The value given as an operation is neither an `@Operation` class nor a `defineOperation` descriptor. */
  InvalidOperation = 'PLATFORM.INTERNAL_API.INVALID_OPERATION',
  /** Missing, empty or oversized idempotency key or tenant id. */
  InvalidIdempotencyKey = 'PLATFORM.INTERNAL_API.INVALID_IDEMPOTENCY_KEY',
  /** The same idempotency key was reused with a different input. */
  IdempotencyKeyReuse = 'PLATFORM.INTERNAL_API.IDEMPOTENCY_KEY_REUSE',
  /** The serialized input or output exceeds the configured limit. */
  PayloadTooLarge = 'PLATFORM.INTERNAL_API.PAYLOAD_TOO_LARGE',
  /** A handler returned something that is not a `CallOutcome`. */
  InvalidHandlerResult = 'PLATFORM.INTERNAL_API.INVALID_HANDLER_RESULT',
}

/**
 * Raised for contract violations found while defining or registering
 * operations. Calls never throw it: the client and the router report contract
 * violations as a `protocol-violation` outcome.
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
