/** Códigos de error estables de `@platform/messaging`. */
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
  /** El tenant del sobre no coincide con el que espera el consumidor. */
  TenantMismatch = 'PLATFORM.MESSAGING.TENANT_MISMATCH',
  /** Un id de mensaje se reutilizó con otro contenido. */
  IdempotencyConflict = 'PLATFORM.MESSAGING.IDEMPOTENCY_CONFLICT',
  /** Opciones inválidas del relay, del dispatcher o de la publicación. */
  InvalidOptions = 'PLATFORM.MESSAGING.INVALID_OPTIONS',
  /** Se usó el bus del outbox fuera de una unidad de trabajo. */
  TransactionRequired = 'PLATFORM.MESSAGING.TRANSACTION_REQUIRED',
  /** El transporte (SNS, SQS) falló o rechazó la llamada. */
  TransportFailed = 'PLATFORM.MESSAGING.TRANSPORT_FAILED',
}
