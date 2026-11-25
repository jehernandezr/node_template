/** State of a {@link ConsecutiveCircuitBreaker}. */
export enum CircuitState {
  /** Calls run; counted failures accumulate. */
  Closed = 'closed',
  /** Calls are rejected without running until `halfOpenAfterMs` elapses. */
  Open = 'open',
  /** Runs a trial call; the others are rejected until it finishes. */
  HalfOpen = 'half-open',
}
