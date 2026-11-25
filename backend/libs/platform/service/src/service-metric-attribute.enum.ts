/** Attributes of the `UseCaseRunner` metrics; all of low cardinality. */
export enum ServiceMetricAttribute {
  /** Class name of the use case. */
  UseCase = 'use_case',
  /** A value of `UseCaseOutcome`. */
  Outcome = 'outcome',
  /** Error code, or its name if it has no code. */
  ErrorType = 'error_type',
}
