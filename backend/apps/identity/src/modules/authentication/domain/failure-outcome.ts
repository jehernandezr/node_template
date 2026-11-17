/** Lo que dejó un fallo de inicio de sesión en los contadores. */
export interface FailureOutcome {
  /** Milisegundos de bloqueo del origen, si este fallo lo activó. */
  readonly lockedForMs?: number;
  readonly protectedModeEnabled: boolean;
}
