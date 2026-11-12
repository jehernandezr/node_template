/** Stable error codes emitted by the messaging library. */
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
}

/** Base error of the messaging library, carrying a stable `code`. */
export class MessagingError extends Error {
  readonly code: MessagingErrorCode;

  constructor(
    code: MessagingErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}
