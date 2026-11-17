/** Dónde corre el handler de una operación interna respecto de su llave de idempotencia. */
export enum HandlerUnitOfWork {
  /**
   * El handler y el guardado del resultado comparten una transacción del `TransactionManager`: el
   * resultado queda guardado si y solo si los efectos se confirmaron.
   */
  Shared = 'shared',
  /**
   * El handler abre sus propias transacciones, en el shard que elige con su entrada, y el resultado se
   * guarda aparte. Lo necesita un servicio con `requireScope`, cuyo shard no se conoce antes del handler.
   */
  Handler = 'handler',
}
