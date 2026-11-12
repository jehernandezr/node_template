/** Protocol error codes raised by the internal API when a contract is violated at definition time. */
export enum InternalApiErrorCode {
  InvalidInput = 'PLATFORM.INTERNAL_API.INVALID_INPUT',
  InvalidOutput = 'PLATFORM.INTERNAL_API.INVALID_OUTPUT',
  UnknownOperation = 'PLATFORM.INTERNAL_API.UNKNOWN_OPERATION',
  DuplicateOperation = 'PLATFORM.INTERNAL_API.DUPLICATE_OPERATION',
  MissingCompensation = 'PLATFORM.INTERNAL_API.MISSING_COMPENSATION',
  MissingHandler = 'PLATFORM.INTERNAL_API.MISSING_HANDLER',
  Timeout = 'PLATFORM.INTERNAL_API.TIMEOUT',
  NonJsonSafeSchema = 'PLATFORM.INTERNAL_API.NON_JSON_SAFE_SCHEMA',
}

/** Thrown for contract violations found while defining or registering contracts, and for client-side input or output violations. */
export class InternalApiError extends Error {
  readonly code: InternalApiErrorCode;

  constructor(code: InternalApiErrorCode, message: string) {
    super(message);
    this.name = 'InternalApiError';
    this.code = code;
  }
}
