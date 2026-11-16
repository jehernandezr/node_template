/** Ciclo de vida de una instancia de saga. */
export enum SagaStatus {
  Running = 'running',
  Suspended = 'suspended',
  Compensating = 'compensating',
  Completed = 'completed',
  Compensated = 'compensated',
  CompensationFailed = 'compensation_failed',
  /** Necesita a una persona: la saga no puede completarse ni compensarse sola. */
  RequiresIntervention = 'requires_intervention',
}
