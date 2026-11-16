/** Formato de un código de error estable: `SERVICIO.SUBMODULO.ERROR`. */
export class ErrorCode {
  /**
   * Mayúsculas, dígitos o guion bajo, con al menos tres segmentos separados por
   * punto. Los contratos declaran la misma expresión, porque un contrato
   * no puede depender del kernel; una prueba comprueba que coinciden.
   */
  static readonly PATTERN = /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$/;

  /** Indica si `value` es un texto con el formato de un código de error. */
  static isValid(value: unknown): value is string {
    return typeof value === 'string' && ErrorCode.PATTERN.test(value);
  }
}
