/** A run keeps a single lease token throughout its whole execution. */
export interface SagaRun {
  readonly sagaId: string;
  readonly token: string;
}
