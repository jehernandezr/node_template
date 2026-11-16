/** Atributos de las métricas de `UseCaseRunner`; todos de cardinalidad baja. */
export enum ServiceMetricAttribute {
  /** Nombre de la clase del caso de uso. */
  UseCase = 'use_case',
  /** Un valor de `UseCaseOutcome`. */
  Outcome = 'outcome',
  /** Código del error, o su nombre si no tiene código. */
  ErrorType = 'error_type',
}
