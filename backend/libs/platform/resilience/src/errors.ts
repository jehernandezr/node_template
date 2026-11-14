import { PlatformErrorCode } from '@contracts/platform';
import { FailureKind, PlatformError } from '@platform/kernel';

/** Codes of `PlatformErrorCode` raised by `@platform/resilience`. */
export type ResilienceErrorCode =
  | PlatformErrorCode.ResilienceCircuitOpen
  | PlatformErrorCode.ResilienceTimeout
  | PlatformErrorCode.ResilienceBulkheadFull
  | PlatformErrorCode.ResilienceUnknownPolicy;

/** Options of {@link ResilienceError}. */
export interface ResilienceErrorOptions {
  readonly cause?: unknown;
  /** Suggested wait before retrying, in milliseconds. */
  readonly retryAfterMs?: number;
  /** Diagnostic data, without secrets or input values. */
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Failure kind per code.
 * - Open circuit and full bulkhead: the call never ran, so repeating it later
 *   is safe (`Transient`).
 * - Timeout: the effect may have been applied (`Timeout`); only a caller that
 *   knows the operation is idempotent repeats it.
 * - Unknown policy: a programming error.
 */
const FAILURE_KIND: Readonly<Record<ResilienceErrorCode, FailureKind>> = {
  [PlatformErrorCode.ResilienceCircuitOpen]: FailureKind.Transient,
  [PlatformErrorCode.ResilienceBulkheadFull]: FailureKind.Transient,
  [PlatformErrorCode.ResilienceTimeout]: FailureKind.Timeout,
  [PlatformErrorCode.ResilienceUnknownPolicy]: FailureKind.ProtocolViolation,
};

/**
 * Error raised by a resilience policy when it rejects or cuts a call.
 * `failureKind` follows from the code, so `classifyFailure` from
 * `@platform/primitives` needs no rules of its own for it.
 */
export class ResilienceError extends PlatformError {
  override readonly code: ResilienceErrorCode;
  /** Failure kind read by `classifyFailure`. */
  readonly failureKind: FailureKind;
  /** Suggested wait before retrying, when known. */
  readonly retryAfterMs?: number;

  constructor(
    code: ResilienceErrorCode,
    message: string,
    options: ResilienceErrorOptions = {},
  ) {
    const kind = FAILURE_KIND[code];
    super(message, {
      retryable: kind === FailureKind.Transient,
      cause: options.cause,
      details: options.details,
    });
    this.code = code;
    this.failureKind = kind;
    this.retryAfterMs = options.retryAfterMs;
  }
}

/** The dependency's circuit is open; the call did not run. */
export class CircuitOpenError extends ResilienceError {
  constructor(
    policy: string,
    dependencyKey: string,
    options: ResilienceErrorOptions = {},
  ) {
    super(
      PlatformErrorCode.ResilienceCircuitOpen,
      `Circuit open for policy "${policy}"`,
      { ...options, details: { policy, dependencyKey } },
    );
  }
}

/** Scope of a timeout. */
export enum TimeoutScope {
  /** One attempt ran out of time. */
  Attempt = 'attempt',
  /** The whole call ran out of budget (deadline). */
  Total = 'total',
}

/** An attempt or the whole call ran out of time. */
export class ResilienceTimeoutError extends ResilienceError {
  readonly scope: TimeoutScope;
  readonly timeoutMs: number;

  constructor(
    policy: string,
    scope: TimeoutScope,
    timeoutMs: number,
    options: ResilienceErrorOptions = {},
  ) {
    super(
      PlatformErrorCode.ResilienceTimeout,
      `Call to policy "${policy}" timed out`,
      {
        ...options,
        details: { policy, scope, timeoutMs },
      },
    );
    this.scope = scope;
    this.timeoutMs = timeoutMs;
  }
}

/** The dependency's bulkhead has no free slot nor queue room; the call did not run. */
export class BulkheadFullError extends ResilienceError {
  constructor(
    policy: string,
    dependencyKey: string,
    options: ResilienceErrorOptions = {},
  ) {
    super(
      PlatformErrorCode.ResilienceBulkheadFull,
      `Bulkhead full for policy "${policy}"`,
      { ...options, details: { policy, dependencyKey } },
    );
  }
}

/** There is no policy with that name. */
export class UnknownPolicyError extends ResilienceError {
  constructor(policy: string) {
    super(
      PlatformErrorCode.ResilienceUnknownPolicy,
      `Unknown resilience policy "${policy}"`,
      { details: { policy } },
    );
  }
}
