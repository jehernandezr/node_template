/**
 * Base de los errores de dominio. El `code` es estable y lo consume el
 * frontend; el `message` es solo para personas.
 */
export abstract class DomainError extends Error {
  /** Código único con forma `SERVICIO.SUBMODULO.ERROR`. */
  abstract readonly code: string;

  /** Datos adicionales opcionales para diagnóstico. */
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}
