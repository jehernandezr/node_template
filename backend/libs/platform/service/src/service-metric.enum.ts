/** Métricas que publica `UseCaseRunner`. */
export enum ServiceMetric {
  /** Histograma de la duración de un caso de uso, en milisegundos. */
  UseCaseDuration = 'service.use_case.duration',
  /** Contador de casos de uso que terminaron con error. */
  UseCaseErrors = 'service.use_case.errors',
}
