/** Transiciones notables que publica el motor. */
export enum SagaEventKind {
  Completed = 'completed',
  Compensated = 'compensated',
  CompensationFailed = 'compensation_failed',
  RequiresIntervention = 'requires_intervention',
  Suspended = 'suspended',
  /** Alerta: un participante rompió el protocolo; el paso se trata como incierto. */
  ProtocolViolation = 'protocol_violation',
}
