/** Valores de configuración del motor. Los que no se pasan toman su valor por defecto de `SagaSettings`. */
export interface SagaSettingsInput {
  /** Identidad de este proceso. Los tokens de lease se derivan de ella. */
  readonly owner: string;
  /** Duración del lease en milisegundos. Debe superar `maxStepDurationMs`. */
  readonly leaseMs?: number;
  /** Llamada más larga esperada a una operación, en milisegundos. */
  readonly maxStepDurationMs?: number;
  /** Intentos fallidos en suspensión antes de exigir intervención. */
  readonly maxSuspendAttempts?: number;
  /** Tiempo en suspensión antes de exigir intervención, en milisegundos. */
  readonly maxSuspendAgeMs?: number;
  /** Cuánto se conserva una saga terminada antes de que `SagaRetentionJob` la borre, en milisegundos. */
  readonly retentionMs?: number;
  /** Sagas que `SagaRecoveryJob` retoma por pasada. */
  readonly recoveryBatchSize?: number;
}
