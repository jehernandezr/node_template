/** Estado de una llave de idempotencia al pedir el claim. */
export enum ClaimState {
  /** Este intento es dueño de la llave hasta `leaseUntil` y debe completarla o liberarla. */
  Acquired = 'acquired',
  /** Otro intento es dueño y su lease sigue vigente. */
  InProgress = 'in-progress',
  /** La operación ya terminó; se devuelve el resultado guardado. */
  Completed = 'completed',
}
