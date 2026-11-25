/** Error codes that `@platform/resilience` emits. */
export enum ResilienceErrorCode {
  CircuitOpen = 'PLATFORM.RESILIENCE.CIRCUIT_OPEN',
  Timeout = 'PLATFORM.RESILIENCE.TIMEOUT',
  BulkheadFull = 'PLATFORM.RESILIENCE.BULKHEAD_FULL',
  UnknownPolicy = 'PLATFORM.RESILIENCE.UNKNOWN_POLICY',
  InvalidPolicy = 'PLATFORM.RESILIENCE.INVALID_POLICY',
}
