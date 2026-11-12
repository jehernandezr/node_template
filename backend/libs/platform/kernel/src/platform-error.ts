/**
 * Forma de un código de error estable: `SERVICIO.SUBMODULO.ERROR`, en
 * mayúsculas, con dígitos o guion bajo y al menos tres segmentos.
 */
export const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$/;

/** Indica si `code` cumple el formato `SERVICIO.SUBMODULO.ERROR`. */
export function isErrorCode(code: unknown): code is string {
  return typeof code === 'string' && ERROR_CODE_PATTERN.test(code);
}

/** Opciones comunes al construir un `PlatformError`. */
export interface PlatformErrorOptions {
  /** Si reintentar la misma operación puede dar otro resultado. Por defecto `false`. */
  readonly retryable?: boolean;
  /** Datos de diagnóstico. No deben incluir secretos ni datos personales. */
  readonly details?: Readonly<Record<string, unknown>>;
  /** Error que lo originó. Se guarda en la propiedad nativa `cause`. */
  readonly cause?: unknown;
}

/**
 * Base de todos los errores de la plataforma. El `code` es estable y lo
 * consumen otros servicios y el frontend; el `message` es solo para personas
 * y no debe incluir valores de entrada crudos.
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
  }
}

/** Indica si `value` es un `PlatformError`. */
export function isPlatformError(value: unknown): value is PlatformError {
  return value instanceof PlatformError;
}
