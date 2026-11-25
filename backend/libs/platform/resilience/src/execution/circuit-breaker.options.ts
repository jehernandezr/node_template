import type { Clock } from '@platform/kernel';

/** Settings and hooks of a {@link ConsecutiveCircuitBreaker}. */
export interface CircuitBreakerOptions {
  /** Consecutive counted failures that open the circuit. */
  readonly consecutiveFailures: number;
  /** Time the circuit stays open before allowing a trial call. */
  readonly halfOpenAfterMs: number;
  /** Time source, so the tests decide when it goes half-open. */
  readonly clock: Clock;
  /** Which errors count as a failure. The others pass without opening the circuit. */
  readonly counts: (error: unknown) => boolean;
  /** Error thrown for a call rejected with the circuit open. */
  readonly rejectWith: () => Error;
  readonly onBreak?: (error: unknown) => void;
  readonly onHalfOpen?: () => void;
  readonly onReset?: () => void;
}
