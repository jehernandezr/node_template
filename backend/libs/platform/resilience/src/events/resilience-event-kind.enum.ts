/** Event types that the policies emit. */
export enum ResilienceEventKind {
  Retry = 'retry',
  Break = 'break',
  HalfOpen = 'half-open',
  Reset = 'reset',
  Timeout = 'timeout',
  BulkheadRejected = 'bulkhead-rejected',
}
