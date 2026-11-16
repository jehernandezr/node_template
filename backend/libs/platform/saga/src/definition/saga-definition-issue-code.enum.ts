/** Tipo de problema que se encuentra al validar las sagas al arrancar. */
export enum SagaDefinitionIssueCode {
  /** Dos definiciones declaran el mismo `type`. */
  TypeMismatch = 'type-mismatch',
  /** La operación del paso no está en el registro de contratos. */
  UnregisteredOperation = 'unregistered-operation',
  /** La operación de compensación no está en el registro de contratos. */
  UnregisteredCompensation = 'unregistered-compensation',
  /** La compensación del paso difiere del `compensatedBy` del contrato. */
  CompensationMismatch = 'compensation-mismatch',
  /** Un paso anterior al pivote cambia datos y su contrato no declara compensación. */
  MissingCompensation = 'missing-compensation',
  /** Un paso posterior al pivote no es idempotente, así que no se puede reintentar hasta completarse. */
  NotIdempotentAfterPivot = 'not-idempotent-after-pivot',
  /** Una compensación no es idempotente, así que no se puede reintentar con la misma llave. */
  NotIdempotentCompensation = 'not-idempotent-compensation',
  /** El presupuesto por defecto de una llamada (intentos y esperas) supera `maxStepDurationMs`. */
  StepBudgetExceeded = 'step-budget-exceeded',
}
