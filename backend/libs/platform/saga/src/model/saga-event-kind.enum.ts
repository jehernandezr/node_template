/** Notable transitions that the engine publishes. */
export enum SagaEventKind {
  Completed = 'completed',
  Compensated = 'compensated',
  CompensationFailed = 'compensation_failed',
  RequiresIntervention = 'requires_intervention',
  Suspended = 'suspended',
  /** Alert: a participant broke the protocol; the step is treated as uncertain. */
  ProtocolViolation = 'protocol_violation',
}
