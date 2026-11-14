/** Atributos de las métricas de resiliencia. Tienen cardinalidad baja. */
export enum ResilienceMetricAttribute {
  Policy = 'policy',
  Dependency = 'dependency',
  Kind = 'kind',
  ErrorCode = 'error.code',
}
