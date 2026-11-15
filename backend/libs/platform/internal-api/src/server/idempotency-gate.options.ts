/** Ajustes del lease de idempotencia. */
export interface IdempotencyGateOptions {
  /**
   * Tiempo extra que el claim sobrevive al plazo de la petición, para que un
   * handler lento conserve la llave hasta terminar. Por defecto, el del almacén (5 s).
   */
  readonly leaseMarginMs?: number;
  /** Lease más corto, contado desde el claim. Por defecto ninguno. */
  readonly minLeaseMs?: number;
}
