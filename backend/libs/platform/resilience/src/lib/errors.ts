/** Stable error codes raised by the resilience layer. */
export enum ResilienceErrorCode {
  CircuitOpen = 'PLATFORM.RESILIENCE.CIRCUIT_OPEN',
  Timeout = 'PLATFORM.RESILIENCE.TIMEOUT',
  BulkheadFull = 'PLATFORM.RESILIENCE.BULKHEAD_FULL',
  Overloaded = 'PLATFORM.RESILIENCE.OVERLOADED',
}

/** Options accepted by {@link ResilienceError}. */
export interface ResilienceErrorOptions {
  /** Original error that caused this one. */
  readonly cause?: unknown;
  /** Suggested wait before retrying, in milliseconds. */
  readonly retryAfterMs?: number;
}

/** Error raised when a resilience policy rejects or aborts a call. */
export class ResilienceError extends Error {
  /** Machine-readable error code. */
  readonly code: ResilienceErrorCode;
  /** Suggested wait before retrying, when known. */
  readonly retryAfterMs?: number;

  /** @param code Error code. @param message Human-readable message. @param options Cause and retry hint. */
  constructor(
    code: ResilienceErrorCode,
    message: string,
    options: ResilienceErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'ResilienceError';
    this.code = code;
    this.retryAfterMs = options.retryAfterMs;
  }
}
