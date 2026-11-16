import { PlatformError, FailureKind } from '@platform/kernel';
import { PersistenceErrorCode } from './persistence-error-code.enum.js';
import type { PersistenceErrorOptions } from './persistence-error-options.js';
import { PostgresFailureClassifier } from './postgres-failure-classifier.js';

/**
 * Error de la capa de persistencia. `failureKind` y `retryable` salen del código,
 * salvo en `QueryFailed`, donde salen de la causa (SQLSTATE o código de red).
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

  /** Error de configuración, con la opción que falló y lo que se esperaba. */
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
