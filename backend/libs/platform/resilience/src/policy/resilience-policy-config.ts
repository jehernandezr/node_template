import type { RetryPolicy } from '@platform/primitives';
import type { TimeoutStrategy } from './timeout-strategy.enum.js';

/** Retries of a policy. The policy counts all attempts, including the first. */
export interface ResilienceRetryConfig {
  /** How many attempts and how the wait between them grows. */
  readonly policy: RetryPolicy;
  /**
   * Cap, in milliseconds, of the server's `Retry-After` hint. The call's
   * deadline bounds it further. Defaults to 60 s.
   */
  readonly maxRetryAfterMs?: number;
}

/** Circuit breaker settings. */
export interface ResilienceCircuitBreakerConfig {
  /** Consecutive transient failures that open the circuit. */
  readonly consecutiveFailures: number;
  /** Time the circuit stays open before allowing a trial call. */
  readonly halfOpenAfterMs: number;
}

/** Bulkhead settings. */
export interface ResilienceBulkheadConfig {
  /** Maximum concurrent calls. */
  readonly limit: number;
  /** Calls that can wait for a slot before being rejected. */
  readonly queue: number;
}

/** Resilience policy declared for an outgoing dependency. */
export interface ResiliencePolicyConfig {
  /** Maximum time of each attempt. */
  readonly timeoutMs: number;
  /** Defaults to `TimeoutStrategy.Aggressive`. */
  readonly timeoutStrategy?: TimeoutStrategy;
  /** Whether the signal is aborted when the call returns. Yes by default; streams disable it. */
  readonly abortOnReturn?: boolean;
  /** Budget of the whole call, retries included. */
  readonly totalTimeoutMs?: number;
  readonly retry?: ResilienceRetryConfig;
  readonly circuitBreaker?: ResilienceCircuitBreakerConfig;
  readonly bulkhead?: ResilienceBulkheadConfig;
  /**
   * Decides which errors are retried and count for the breaker. Defaults to
   * the failure classifier of `@platform/primitives`.
   */
  readonly isTransient?: (error: unknown) => boolean;
}
