import { PlatformErrorCode } from '@contracts/platform';
import {
  FailureKind,
  PlatformError,
  type PlatformErrorOptions,
} from '@platform/kernel';

/** Error codes of the messaging library, declared once in `@contracts/platform`. */
export type MessagingErrorCode =
  | PlatformErrorCode.MessagingInvalidEnvelope
  | PlatformErrorCode.MessagingInvalidPayload
  | PlatformErrorCode.MessagingInvalidRetryPolicy
  | PlatformErrorCode.MessagingInvalidTopology
  | PlatformErrorCode.MessagingUnknownRoute
  | PlatformErrorCode.MessagingUnknownQueue
  | PlatformErrorCode.MessagingDuplicateHandler
  | PlatformErrorCode.MessagingPermanentError
  | PlatformErrorCode.MessagingPayloadTooLarge
  /** The envelope tenant does not match the tenant the consumer expects. */
  | PlatformErrorCode.MessagingTenantMismatch
  /** A message id was reused with different content. */
  | PlatformErrorCode.MessagingIdempotencyConflict
  /** Invalid relay, dispatcher or publish options (delay, group id). */
  | PlatformErrorCode.MessagingInvalidOptions
  /** The outbox bus was called outside a unit of work. */
  | PlatformErrorCode.MessagingTransactionRequired
  /** The transport (SNS, SQS) failed or rejected the call. */
  | PlatformErrorCode.MessagingTransportFailed;

/**
 * Short names of the {@link MessagingErrorCode} values, for the transport
 * adapters that build and match these errors. The values are the
 * `PlatformErrorCode` members themselves.
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
  TenantMismatch: PlatformErrorCode.MessagingTenantMismatch,
  IdempotencyConflict: PlatformErrorCode.MessagingIdempotencyConflict,
  InvalidOptions: PlatformErrorCode.MessagingInvalidOptions,
  TransactionRequired: PlatformErrorCode.MessagingTransactionRequired,
  TransportFailed: PlatformErrorCode.MessagingTransportFailed,
} as const satisfies Record<string, MessagingErrorCode>);

/** Options of a {@link MessagingError}. */
export interface MessagingErrorOptions extends PlatformErrorOptions {
  /** How the failure behaves when retried. Defaults to what `retryable` says. */
  readonly failureKind?: FailureKind;
}

/**
 * Base error of the messaging library, carrying a stable `code`. A messaging
 * error is final unless it says otherwise: `failureKind` is `Transient` only
 * when the error was declared retryable, so `classifyFailure` never turns it
 * into a retry because of its `cause`. The message must not include raw input
 * values.
 */
export class MessagingError extends PlatformError {
  override readonly code: MessagingErrorCode;
  readonly failureKind: FailureKind;

  constructor(
    code: MessagingErrorCode,
    message: string,
    options: MessagingErrorOptions = {},
  ) {
    const { failureKind, ...rest } = options;
    const kind =
      failureKind ??
      (rest.retryable === true ? FailureKind.Transient : FailureKind.Permanent);
    super(message, { ...rest, retryable: kind === FailureKind.Transient });
    this.code = code;
    this.failureKind = kind;
  }
}
