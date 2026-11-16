/** Respuesta de un limitador. */
export interface RateLimitResult {
  /** Si la operación cabe en el límite. */
  readonly allowed: boolean;
  /** Unidades estimadas en la ventana deslizante, redondeadas hacia arriba. */
  readonly count: number;
  /** Unidades que todavía caben, `limit - count` y nunca negativo. */
  readonly remaining: number;
  /**
   * Espera hasta que la operación cabría si no llega más tráfico, en
   * milisegundos. Es 0 cuando `allowed` es verdadero.
   */
  readonly retryAfterMs: number;
}
