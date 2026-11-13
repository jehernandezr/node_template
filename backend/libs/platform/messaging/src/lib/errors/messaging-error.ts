import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError, type PlatformErrorOptions } from '@platform/kernel';

/**
 * Stable error codes emitted by the messaging library. Each value is a member
 * of `PlatformErrorCode` of `@contracts/platform`, the catalog the front also
 * reads, so a code is written once. It is a frozen object instead of an enum
 * because `isolatedModules` does not allow enum members initialized from
 * another module's enum.
 */
export const MessagingErrorCode = Object.freeze({
  InvalidEnvelope: PlatformErrorCode.MessagingInvalidEnvelope,
  InvalidPayload: PlatformErrorCode.MessagingInvalidPayload,
  InvalidRetryPolicy: PlatformErrorCode.MessagingInvalidRetryPolicy,
  InvalidTopology: PlatformErrorCode.MessagingInvalidTopology,
  UnknownRoute: PlatformErrorCode.MessagingUnknownRoute,
  UnknownQueue: PlatformErrorCode.MessagingUnknownQueue,
  DuplicateHandler: PlatformErrorCode.MessagingDuplicateHandler,
  PermanentError: PlatformErrorCode.MessagingPermanentError,
  PayloadTooLarge: PlatformErrorCode.MessagingPayloadTooLarge,
  /** The envelope tenant does not match the tenant the consumer expects. */
  TenantMismatch: PlatformErrorCode.MessagingTenantMismatch,
  /** A message id was reused with different content. */
  IdempotencyConflict: PlatformErrorCode.MessagingIdempotencyConflict,
  /** Invalid relay, dispatcher or publish options (delay, group id). */
  InvalidOptions: PlatformErrorCode.MessagingInvalidOptions,
  /** The outbox bus was called outside a unit of work. */
  TransactionRequired: PlatformErrorCode.MessagingTransactionRequired,
  /** The transport (SNS, SQS) failed or rejected the call. Retryable. */
  TransportFailed: PlatformErrorCode.MessagingTransportFailed,
} as const);

/** One of the {@link MessagingErrorCode} values. */
export type MessagingErrorCode =
  (typeof MessagingErrorCode)[keyof typeof MessagingErrorCode];

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
