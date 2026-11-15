/** Motivos que la API interna pone en los resultados que no son un éxito. */
export enum InternalApiReason {
  InvalidInput = 'invalid-input',
  InvalidOutput = 'invalid-output',
  UnknownOperation = 'unknown-operation',
  UndeclaredError = 'undeclared-error',
  IdempotencyKeyReuse = 'idempotency-key-reuse',
  InvalidIdempotencyKey = 'invalid-idempotency-key',
  PayloadTooLarge = 'payload-too-large',
  InvalidHandlerResult = 'invalid-handler-result',
  DeadlineExceeded = 'deadline-exceeded',
  InProgress = 'in-progress',
  Timeout = 'timeout',
  Cancelled = 'cancelled',
  StaleClaim = 'stale-claim',
  /** La unidad de trabajo falló al confirmar: los efectos pueden o no estar guardados. */
  CommitFailed = 'commit-failed',
  /** El servidor rechazó la firma de la llamada. */
  Unauthenticated = 'unauthenticated',
  /** La respuesta HTTP no tiene la forma del protocolo. */
  InvalidResponse = 'invalid-response',
  /** El servidor respondió con un estado HTTP que el protocolo no admite. */
  UnexpectedStatus = 'unexpected-status',
}
