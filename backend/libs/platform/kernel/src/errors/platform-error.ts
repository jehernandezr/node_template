import { ErrorCode } from './error-code.js';
import { FailureKind } from './failure-kind.js';

/**
 * Forma de un código de error estable: `SERVICIO.SUBMODULO.ERROR`.
 * @deprecated Usa `ErrorCode.PATTERN`.
 */
export const ERROR_CODE_PATTERN = ErrorCode.PATTERN;

/**
 * Indica si `code` cumple el formato `SERVICIO.SUBMODULO.ERROR`.
 * @deprecated Usa `ErrorCode.isValid`.
 */
export function isErrorCode(code: unknown): code is string {
  return ErrorCode.isValid(code);
}

/** Opciones comunes al construir un `PlatformError`. */
export interface PlatformErrorOptions {
  /**
   * `true` si reintentar la misma operación puede dar otro resultado. Sin
   * valor, o con `false`, quien clasifica la falla sigue a la `cause` y, si
   * nada la explica, la trata como permanente.
   */
  readonly retryable?: boolean;
  /** Datos de diagnóstico. No deben incluir secretos ni datos personales. */
  readonly details?: Readonly<Record<string, unknown>>;
  /** Error que lo originó. Se guarda en la propiedad nativa `cause`. */
  readonly cause?: unknown;
  /**
   * Clase de la falla. Por defecto `Transient` si `retryable` es `true` y
   * `Permanent` si no. Una subclase que necesita otra (tiempo agotado,
   * violación de protocolo) la pasa en `super`.
   */
  readonly failureKind?: FailureKind;
}

/**
 * Base de todos los errores de la plataforma. El `code` es estable y lo
 * consumen otros servicios y el frontend; el `message` es solo para personas
 * y no debe incluir valores de entrada crudos.
 *
 * El constructor deja calculada la propiedad `failureKind`, pero la clase no
 * la declara: varias subclases la redeclaran sin `override` y, con
 * `noImplicitOverride`, una declaración aquí las dejaría sin compilar. Quien
 * tiene un `PlatformError` la lee con `FailureClassifier`.
 */
export abstract class PlatformError extends Error {
  /** Código único con forma `SERVICIO.SUBMODULO.ERROR`. */
  abstract readonly code: string;

  /** Si reintentar la misma operación puede dar otro resultado. */
  readonly retryable: boolean;

  /** Datos adicionales opcionales para diagnóstico. */
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

  /** Indica si `value` es un `PlatformError`. */
  static is(value: unknown): value is PlatformError {
    return value instanceof PlatformError;
  }
}

/**
 * Indica si `value` es un `PlatformError`.
 * @deprecated Usa `PlatformError.is`.
 */
export function isPlatformError(value: unknown): value is PlatformError {
  return PlatformError.is(value);
}
