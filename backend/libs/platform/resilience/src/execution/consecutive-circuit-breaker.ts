import { CircuitState } from './circuit-state.enum.js';
import type { CircuitBreakerOptions } from './circuit-breaker.options.js';

/**
 * Circuit breaker that opens after N consecutive counted failures. A success
 * resets the count. After `halfOpenAfterMs`, it runs a trial call:
 * if it fails with a counted error, the circuit opens again; any other
 * result closes it, because only a counted failure says the dependency
 * is still down.
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
