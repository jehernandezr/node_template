/** Topes que acepta una regla y una llamada. */
export class RateLimitLimits {
  /**
   * Forma del nombre de una regla. Sin `:` ni llaves, porque el nombre entra en
   * las llaves de Valkey y en su hash tag.
   */
  static readonly RULE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
  /** Mayor límite que acepta una regla. */
  static readonly MAX_LIMIT = 1_000_000;
  /** Mayor ventana que acepta una regla: 30 días. */
  static readonly MAX_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;
  /** Mayor longitud, en caracteres, de la llave que se limita. */
  static readonly MAX_KEY_LENGTH = 512;
}
