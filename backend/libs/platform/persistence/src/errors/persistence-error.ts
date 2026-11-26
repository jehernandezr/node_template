import { PlatformError, FailureKind } from '@platform/kernel';
import { PersistenceErrorCode } from './persistence-error-code.enum.js';
import type { PersistenceErrorOptions } from './persistence-error-options.js';
import { PostgresFailureClassifier } from './postgres-failure-classifier.js';

/**
 * Persistence layer error. `failureKind` and `retryable` come from the code,
 * except in `QueryFailed`, where they come from the cause (SQLSTATE or network code).
 */
export class PersistenceError extends PlatformError {
  private static readonly FAILURE_KIND: Readonly<
    Record<
      Exclude<PersistenceErrorCode, PersistenceErrorCode.QueryFailed>,
      FailureKind
    >
  > = {
    [PersistenceErrorCode.InvalidConfig]: FailureKind.ProtocolViolation,
    [PersistenceErrorCode.TransactionRequired]: FailureKind.ProtocolViolation,
    [PersistenceErrorCode.TenantRequired]: FailureKind.ProtocolViolation,
    [PersistenceErrorCode.TenantMismatch]: FailureKind.ProtocolViolation,
    [PersistenceErrorCode.CorruptRow]: FailureKind.Permanent,
    [PersistenceErrorCode.Contention]: FailureKind.Transient,
    [PersistenceErrorCode.ShuttingDown]: FailureKind.Transient,
  };

  override readonly code: PersistenceErrorCode;
  readonly failureKind: FailureKind;

  constructor(
    code: PersistenceErrorCode,
    message: string,
    options: PersistenceErrorOptions = {},
  ) {
    const failureKind =
      code === PersistenceErrorCode.QueryFailed
        ? (options.failureKind ??
          PostgresFailureClassifier.classify(options.cause))
        : PersistenceError.FAILURE_KIND[code];
    super(message, {
      retryable: failureKind === FailureKind.Transient,
      details: options.details,
      cause: options.cause,
    });
    this.code = code;
    this.failureKind = failureKind;
  }

  /**
   * Configuration error, with the option that failed and what was expected.
   * @param option Option that failed.
   * @param expectation What was expected.
   * @returns The error.
   */
  static invalidConfiguration(
    option: string,
    expectation: string,
  ): PersistenceError {
    return new PersistenceError(
      PersistenceErrorCode.InvalidConfig,
      `${option} must be ${expectation}`,
      { details: { option } },
    );
  }
}
