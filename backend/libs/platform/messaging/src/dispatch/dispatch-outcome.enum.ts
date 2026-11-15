/** Resultado de atender una entrega. */
export enum DispatchOutcome {
  Processed = 'processed',
  Duplicate = 'duplicate',
  /** Tipo de evento sin manejador: se confirma y se descarta. */
  Ignored = 'ignored',
  RetryLater = 'retry-later',
  DeadLetter = 'dead-letter',
  /**
   * Otra entrega del mismo mensaje tiene el claim y su lease sigue vigente (el
   * primer manejador puede seguir corriendo). Nunca se confirma: se deja para
   * reentrega, por ejemplo como fallo de un ítem del lote de SQS.
   */
  InProgress = 'in-progress',
}
