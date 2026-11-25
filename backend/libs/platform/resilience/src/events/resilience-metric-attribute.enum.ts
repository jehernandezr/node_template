/** Attributes of the resilience metrics. They have low cardinality. */
export enum ResilienceMetricAttribute {
  Policy = 'policy',
  Dependency = 'dependency',
  Kind = 'kind',
  ErrorCode = 'error.code',
}
