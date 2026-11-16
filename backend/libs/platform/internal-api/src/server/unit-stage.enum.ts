/** Hasta dónde llegó una unidad de trabajo, para decidir cómo cerrar la llave al fallar. */
export enum UnitStage {
  /** La unidad de trabajo no se abrió: nada corrió. */
  Begin = 'begin',
  Handler = 'handler',
  /** El resultado se guarda dentro de la unidad de trabajo. */
  Complete = 'complete',
  /** El resultado ya se guardó y la unidad de trabajo se está confirmando. */
  Commit = 'commit',
}
