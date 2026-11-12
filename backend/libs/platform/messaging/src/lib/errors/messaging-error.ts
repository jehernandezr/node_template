import { PlatformError, type PlatformErrorOptions } from '@platform/kernel';

/** Stable error codes emitted by the messaging library (`SERVICE.SUBMODULE.ERROR`). */
export enum MessagingErrorCode {
  InvalidEnvelope = 'PLATFORM.MESSAGING.INVALID_ENVELOPE',
  InvalidPayload = 'PLATFORM.MESSAGING.INVALID_PAYLOAD',
  InvalidRetryPolicy = 'PLATFORM.MESSAGING.INVALID_RETRY_POLICY',
  InvalidTopology = 'PLATFORM.MESSAGING.INVALID_TOPOLOGY',
  UnknownRoute = 'PLATFORM.MESSAGING.UNKNOWN_ROUTE',
  UnknownQueue = 'PLATFORM.MESSAGING.UNKNOWN_QUEUE',
  DuplicateHandler = 'PLATFORM.MESSAGING.DUPLICATE_HANDLER',
  PermanentError = 'PLATFORM.MESSAGING.PERMANENT_ERROR',
  PayloadTooLarge = 'PLATFORM.MESSAGING.PAYLOAD_TOO_LARGE',
  /** The envelope tenant does not match the tenant the consumer expects. */
  TenantMismatch = 'PLATFORM.MESSAGING.TENANT_MISMATCH',
  /** A message id was reused with different content. */
  IdempotencyConflict = 'PLATFORM.MESSAGING.IDEMPOTENCY_CONFLICT',
  /** Invalid relay or dispatcher configuration. */
  InvalidOptions = 'PLATFORM.MESSAGING.INVALID_OPTIONS',
}

/**
 * Base error of the messaging library, carrying a stable `code`. Extends
 * `PlatformError`, so `classifyFailure` reads `retryable` (false by default).
 * The message must not include raw input values.
 */
export class MessagingError extends PlatformError {
  override readonly code: MessagingErrorCode;

  constructor(
    code: MessagingErrorCode,
    message: string,
    options: PlatformErrorOptions = {},
  ) {
    super(message, options);
    this.code = code;
  }
}
