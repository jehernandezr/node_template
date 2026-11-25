import { FailureKind, PlatformError } from '@platform/kernel';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** Options of {@link ResilienceError}. */
export interface ResilienceErrorOptions {
  readonly cause?: unknown;
  /** Suggested wait before retrying, in milliseconds. */
  readonly retryAfterMs?: number;
  /** Diagnostic data, without secrets or input values. */
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Error that a policy throws when rejecting or cutting a call. The failure
 * class comes from the code: an open circuit or a full bulkhead did not run
 * the call, so retrying it is safe; a timeout leaves the effect
 * uncertain; an unknown or invalid policy is a programming error.
 */
export class ResilienceError extends PlatformError {
  private static readonly FAILURE_KINDS: Readonly<
    Record<ResilienceErrorCode, FailureKind>
  > = {
    [ResilienceErrorCode.CircuitOpen]: FailureKind.Transient,
    [ResilienceErrorCode.BulkheadFull]: FailureKind.Transient,
    [ResilienceErrorCode.Timeout]: FailureKind.Timeout,
    [ResilienceErrorCode.UnknownPolicy]: FailureKind.ProtocolViolation,
    [ResilienceErrorCode.InvalidPolicy]: FailureKind.ProtocolViolation,
  };

  override readonly code: ResilienceErrorCode;
  /** Suggested wait before retrying, when known. */
  readonly retryAfterMs?: number;

  constructor(
    code: ResilienceErrorCode,
    message: string,
    options: ResilienceErrorOptions = {},
  ) {
    const kind = ResilienceError.FAILURE_KINDS[code];
    super(message, {
      retryable: kind === FailureKind.Transient,
      failureKind: kind,
      cause: options.cause,
      details: options.details,
    });
    this.code = code;
    this.retryAfterMs = options.retryAfterMs;
  }
}
