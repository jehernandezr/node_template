/** Tipos de evento que emiten las políticas. */
export enum ResilienceEventKind {
  Retry = 'retry',
  Break = 'break',
  HalfOpen = 'half-open',
  Reset = 'reset',
  Timeout = 'timeout',
  BulkheadRejected = 'bulkhead-rejected',
}
