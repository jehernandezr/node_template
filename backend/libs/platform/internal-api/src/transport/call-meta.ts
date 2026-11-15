/** Metadatos que viajan con cada intento. */
export interface CallMeta {
  readonly idempotencyKey: string;
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
  /** Milisegundos que quedaban para este intento cuando se envió. */
  readonly timeoutMs: number;
  /**
   * Milisegundos epoch después de los cuales el servidor no debe empezar el
   * trabajo. Es el límite del intento, nunca posterior al `Deadline` de quien
   * llama. El servidor deriva de él el lease de idempotencia.
   */
  readonly deadline: number;
  /** Se aborta cuando el intento vence o quien llama cancela. */
  readonly signal?: AbortSignal;
}
