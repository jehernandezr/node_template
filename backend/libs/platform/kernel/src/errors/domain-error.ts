import type { FailureKind } from './failure-kind.js';
import { PlatformError } from './platform-error.js';

/** Additional options of a `DomainError`. */
export interface DomainErrorOptions {
  /** Error that caused it. */
  readonly cause?: unknown;
  /** Whether retrying can give a different result (for example, a concurrency conflict). Defaults to `false`. */
  readonly retryable?: boolean;
}

/**
 * Base of domain errors. The `code` is stable and the frontend consumes
 * it; the `message` is only for people. By default it is not retryable:
 * a business rule gives the same result when repeated.
 */
export abstract class DomainError extends PlatformError {
  /** A business rule does not depend on its `cause`: the kind comes only from `retryable`. */
  declare readonly failureKind: FailureKind;

  constructor(
    message: string,
    details?: Readonly<Record<string, unknown>>,
    options: DomainErrorOptions = {},
  ) {
    super(message, {
      details,
      cause: options.cause,
      retryable: options.retryable ?? false,
    });
  }
}
