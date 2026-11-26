import { FailureKind } from './failure-kind.js';

/** Common options when building a `PlatformError`. */
export interface PlatformErrorOptions {
  /**
   * `true` if retrying the same operation can give a different result. Without a
   * value, or with `false`, whoever classifies the failure follows the `cause` and, if
   * nothing explains it, treats it as permanent.
   */
  readonly retryable?: boolean;
  /** Diagnostic data. Must not include secrets or personal data. */
  readonly details?: Readonly<Record<string, unknown>>;
  /** Error that caused it. Stored in the native `cause` property. */
  readonly cause?: unknown;
  /**
   * Kind of the failure. Defaults to `Transient` if `retryable` is `true` and
   * `Permanent` otherwise. A subclass that needs another one (timeout,
   * protocol violation) passes it in `super`.
   */
  readonly failureKind?: FailureKind;
}

/**
 * Base of all platform errors. The `code` is stable and other services
 * and the frontend consume it; the `message` is only for people
 * and must not include raw input values.
 *
 * The constructor computes the `failureKind` property, but the class does not
 * declare it: several subclasses redeclare it without `override` and, with
 * `noImplicitOverride`, a declaration here would make them fail to compile. Whoever
 * has a `PlatformError` reads it with `FailureClassifier`.
 */
export abstract class PlatformError extends Error {
  /** Unique code shaped as `SERVICE.SUBMODULE.ERROR`. */
  abstract readonly code: string;

  /** Whether retrying the same operation can give a different result. */
  readonly retryable: boolean;

  /** Optional additional diagnostic data. */
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(message: string, options: PlatformErrorOptions = {}) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = new.target.name;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
    Object.defineProperty(this, 'failureKind', {
      value:
        options.failureKind ??
        (this.retryable ? FailureKind.Transient : FailureKind.Permanent),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  /**
   * Whether `value` is a `PlatformError`.
   * @param value Value to check.
   * @returns `true` for a platform error.
   */
  static is(value: unknown): value is PlatformError {
    return value instanceof PlatformError;
  }
}
