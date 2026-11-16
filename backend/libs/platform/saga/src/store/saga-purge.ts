/** Qué borra `SagaStore.purge`. */
export interface SagaPurge {
  /** Se borran las sagas `Completed` o `Compensated` cuya última actualización es anterior a este instante. */
  readonly before: Date;
  /** Máximo de sagas por llamada. Por defecto, `SagaStore.DEFAULT_PURGE_LIMIT`. */
  readonly limit?: number;
}
