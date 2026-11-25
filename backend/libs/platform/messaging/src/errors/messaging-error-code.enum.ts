/** Stable error codes of `@platform/messaging`. */
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
  /** The envelope tenant does not match the one the consumer expects. */
  TenantMismatch = 'PLATFORM.MESSAGING.TENANT_MISMATCH',
  /** A message id was reused with different content. */
  IdempotencyConflict = 'PLATFORM.MESSAGING.IDEMPOTENCY_CONFLICT',
  /** Invalid options of the relay, the dispatcher or the publication. */
  InvalidOptions = 'PLATFORM.MESSAGING.INVALID_OPTIONS',
  /** The outbox bus was used outside a unit of work. */
  TransactionRequired = 'PLATFORM.MESSAGING.TRANSACTION_REQUIRED',
  /** The transport (SNS, SQS) failed or rejected the call. */
  TransportFailed = 'PLATFORM.MESSAGING.TRANSPORT_FAILED',
}
