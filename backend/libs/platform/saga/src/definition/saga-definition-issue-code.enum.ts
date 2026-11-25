/** Kind of issue found when validating the sagas at startup. */
export enum SagaDefinitionIssueCode {
  /** Two definitions declare the same `type`. */
  TypeMismatch = 'type-mismatch',
  /** The step's operation is not in the contract registry. */
  UnregisteredOperation = 'unregistered-operation',
  /** The compensation operation is not in the contract registry. */
  UnregisteredCompensation = 'unregistered-compensation',
  /** The step's compensation differs from the contract's `compensatedBy`. */
  CompensationMismatch = 'compensation-mismatch',
  /** A step before the pivot changes data and its contract declares no compensation. */
  MissingCompensation = 'missing-compensation',
  /** A step after the pivot is not idempotent, so it cannot be retried until it completes. */
  NotIdempotentAfterPivot = 'not-idempotent-after-pivot',
  /** A compensation is not idempotent, so it cannot be retried with the same key. */
  NotIdempotentCompensation = 'not-idempotent-compensation',
  /** The default budget of a call (attempts and waits) exceeds `maxStepDurationMs`. */
  StepBudgetExceeded = 'step-budget-exceeded',
}
