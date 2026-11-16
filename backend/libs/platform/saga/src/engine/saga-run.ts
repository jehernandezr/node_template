/** Una corrida mantiene un solo token de lease durante toda su ejecución. */
export interface SagaRun {
  readonly sagaId: string;
  readonly token: string;
}
