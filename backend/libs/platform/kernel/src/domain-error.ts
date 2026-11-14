import { FailureKind } from './failure-kind.js';
import { PlatformError } from './platform-error.js';

/** Opciones adicionales de un `DomainError`. */
export interface DomainErrorOptions {
  /** Error que lo originó. */
  readonly cause?: unknown;
  /** Si reintentar puede dar otro resultado (por ejemplo, un conflicto de concurrencia). Por defecto `false`. */
  readonly retryable?: boolean;
}

/**
 * Base de los errores de dominio. El `code` es estable y lo consume el
 * frontend; el `message` es solo para personas. Por defecto no es reintentable:
 * una regla de negocio da el mismo resultado al repetirse.
 */
export abstract class DomainError extends PlatformError {
  /** Una regla de negocio no depende de su `cause`: la clase sale solo de `retryable`. */
  readonly failureKind: FailureKind;

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
    this.failureKind =
      options.retryable === true
        ? FailureKind.Transient
        : FailureKind.Permanent;
  }
}
