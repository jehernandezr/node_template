/** Etapa de un traslado de tenant en `tenant_moves`. */
export enum TenantMoveStatus {
  /** La saga copia, congela o apunta los servicios al destino. */
  Running = 'running',
  /** Todos los servicios ya apuntan al destino; el origen espera la gracia antes de limpiarse. */
  Switched = 'switched',
  /** La saga se compensó: el tenant sigue en el origen. */
  Aborted = 'aborted',
  /** Los datos que quedaron en el origen ya se borraron. */
  CleanedUp = 'cleaned-up',
}
