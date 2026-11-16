/** Lo que el programador entrega a cada corrida de un job. */
export interface JobContext {
  /** Aborta cuando se agota `timeoutMs` o la aplicación se apaga. */
  readonly signal: AbortSignal;
  readonly startedAt: Date;
  /** Identificador de esta corrida, para correlacionar logs y métricas. */
  readonly runId: string;
}
