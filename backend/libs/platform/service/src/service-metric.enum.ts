/** Metrics that `UseCaseRunner` publishes. */
export enum ServiceMetric {
  /** Histogram of the duration of a use case, in milliseconds. */
  UseCaseDuration = 'service.use_case.duration',
  /** Counter of use cases that ended with an error. */
  UseCaseErrors = 'service.use_case.errors',
}
