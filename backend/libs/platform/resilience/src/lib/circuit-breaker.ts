import type { Clock } from '@platform/kernel';

/** State of a {@link ConsecutiveCircuitBreaker}. */
export enum CircuitState {
  /** Calls run; counted failures accumulate. */
  Closed = 'closed',
  /** Calls are rejected without running until `halfOpenAfterMs` passes. */
  Open = 'open',
  /** One trial call runs; the rest are rejected until it settles. */
  HalfOpen = 'half-open',
}

/** Settings and hooks of a {@link ConsecutiveCircuitBreaker}. */
export interface CircuitBreakerOptions {
  /** Consecutive counted failures that open the circuit. */
  readonly consecutiveFailures: number;
  /** Time the circuit stays open before a trial call is allowed. */
  readonly halfOpenAfterMs: number;
  /** Time source, so tests decide when the circuit half-opens. */
  readonly clock: Clock;
  /** Failures that open the circuit. Any other error passes through and never trips it. */
  readonly counts: (error: unknown) => boolean;
  /** Error thrown for a call rejected while the circuit is open. */
  readonly rejectWith: () => Error;
  readonly onBreak?: (error: unknown) => void;
  readonly onHalfOpen?: () => void;
  readonly onReset?: () => void;
}

/**
 * Circuit breaker that opens after N consecutive counted failures. A success
 * resets the count. After `halfOpenAfterMs` one trial call runs: if it fails
 * with a counted error the circuit opens again; any other result closes it,
 * because only a counted failure says the dependency is still down.
 */
export class ConsecutiveCircuitBreaker {
  private current = CircuitState.Closed;
  private failures = 0;
  private openedAtMs = 0;
  private trialInFlight = false;

  constructor(private readonly options: CircuitBreakerOptions) {}

  get state(): CircuitState {
    return this.current;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.current === CircuitState.Open) {
      const elapsed = this.options.clock.now().getTime() - this.openedAtMs;
      if (elapsed < this.options.halfOpenAfterMs) {
        throw this.options.rejectWith();
      }
      this.current = CircuitState.HalfOpen;
      this.options.onHalfOpen?.();
    }
    if (this.current === CircuitState.HalfOpen) {
      return this.trial(fn);
    }
    try {
      const value = await fn();
      this.failures = 0;
      return value;
    } catch (error) {
      if (this.options.counts(error)) {
        this.failures += 1;
        if (this.failures >= this.options.consecutiveFailures) {
          this.open(error);
        }
      }
      throw error;
    }
  }

  private async trial<T>(fn: () => Promise<T>): Promise<T> {
    if (this.trialInFlight) {
      throw this.options.rejectWith();
    }
    this.trialInFlight = true;
    try {
      const value = await fn();
      this.close();
      return value;
    } catch (error) {
      if (this.options.counts(error)) {
        this.open(error);
      } else {
        this.close();
      }
      throw error;
    } finally {
      this.trialInFlight = false;
    }
  }

  private open(error: unknown): void {
    this.current = CircuitState.Open;
    this.openedAtMs = this.options.clock.now().getTime();
    this.options.onBreak?.(error);
  }

  private close(): void {
    this.current = CircuitState.Closed;
    this.failures = 0;
    this.options.onReset?.();
  }
}
