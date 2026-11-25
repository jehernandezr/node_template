/** Life cycle of a saga instance. */
export enum SagaStatus {
  Running = 'running',
  Suspended = 'suspended',
  Compensating = 'compensating',
  Completed = 'completed',
  Compensated = 'compensated',
  CompensationFailed = 'compensation_failed',
  /** Needs a person: the saga cannot complete or compensate on its own. */
  RequiresIntervention = 'requires_intervention',
}
