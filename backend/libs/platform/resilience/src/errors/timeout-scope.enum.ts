/** Alcance de un tiempo agotado. */
export enum TimeoutScope {
  /** Un intento se quedó sin tiempo. */
  Attempt = 'attempt',
  /** La llamada completa se quedó sin presupuesto. */
  Total = 'total',
}
