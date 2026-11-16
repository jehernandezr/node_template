/** Códigos de error que emite `@platform/internal-api`. */
export enum InternalApiErrorCode {
  InvalidOutput = 'PLATFORM.INTERNAL_API.INVALID_OUTPUT',
  UnknownOperation = 'PLATFORM.INTERNAL_API.UNKNOWN_OPERATION',
  DuplicateOperation = 'PLATFORM.INTERNAL_API.DUPLICATE_OPERATION',
  MissingCompensation = 'PLATFORM.INTERNAL_API.MISSING_COMPENSATION',
  MissingHandler = 'PLATFORM.INTERNAL_API.MISSING_HANDLER',
  NonJsonSafeSchema = 'PLATFORM.INTERNAL_API.NON_JSON_SAFE_SCHEMA',
  /** El valor recibido como operación no es un descriptor de `defineOperation`. */
  InvalidOperation = 'PLATFORM.INTERNAL_API.INVALID_OPERATION',
  /** Llave de idempotencia o tenant ausente, vacío o demasiado largo. */
  InvalidIdempotencyKey = 'PLATFORM.INTERNAL_API.INVALID_IDEMPOTENCY_KEY',
  /** La misma llave se reusó con otra entrada. */
  IdempotencyKeyReuse = 'PLATFORM.INTERNAL_API.IDEMPOTENCY_KEY_REUSE',
  /** La entrada o la salida serializada supera el límite. */
  PayloadTooLarge = 'PLATFORM.INTERNAL_API.PAYLOAD_TOO_LARGE',
  /** Un handler devolvió algo que no es un `CallOutcome`. */
  InvalidHandlerResult = 'PLATFORM.INTERNAL_API.INVALID_HANDLER_RESULT',
  /** Una operación puede tardar más de lo que el registro permite por llamada, reintentos incluidos. */
  CallBudgetExceeded = 'PLATFORM.INTERNAL_API.CALL_BUDGET_EXCEEDED',
  /** La firma de la llamada falta, no coincide o está fuera de la ventana de tiempo. */
  Unauthenticated = 'PLATFORM.INTERNAL_API.UNAUTHENTICATED',
  /** El cuerpo o las cabeceras de la llamada no tienen la forma del protocolo. */
  InvalidRequest = 'PLATFORM.INTERNAL_API.INVALID_REQUEST',
  /** Las opciones del transporte o de la firma no son válidas. */
  InvalidConfiguration = 'PLATFORM.INTERNAL_API.INVALID_CONFIGURATION',
  /** Ninguna URL base está configurada para el servicio dueño de la operación. */
  UnknownService = 'PLATFORM.INTERNAL_API.UNKNOWN_SERVICE',
}
