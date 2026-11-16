/** Estado de un intento guardado en la bitácora de pasos. */
export enum StepStatus {
  /** Se escribe antes de la llamada; el resultado aún no se conoce. */
  Dispatched = 'dispatched',
  Succeeded = 'succeeded',
  /** Error de negocio definitivo: la operación no se aplicó. */
  Failed = 'failed',
  /** Falla transitoria, resultado desconocido o violación de protocolo: la operación pudo aplicarse. */
  Uncertain = 'uncertain',
}
