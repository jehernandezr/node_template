import { ResiliencePolicyName } from './policy-name.js';

/** How a per-attempt timeout is enforced. */
export enum TimeoutStrategy {
  /** Aborts the signal and waits for the operation to honor it. */
  Cooperative = 'cooperative',
  /** Rejects as soon as the timeout fires, even if the operation keeps running. */
  Aggressive = 'aggressive',
}

/** Retry settings. `maxAttempts` counts every call, including the first one. */
export interface ResilienceRetryConfig {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
}

/** Circuit breaker settings. */
export interface ResilienceCircuitBreakerConfig {
  /** Consecutive transient failures that open the circuit. */
  readonly consecutiveFailures: number;
  /** Time the circuit stays open before a trial call is allowed. */
  readonly halfOpenAfterMs: number;
}

/** Bulkhead settings. */
export interface ResilienceBulkheadConfig {
  /** Maximum concurrent calls. */
  readonly limit: number;
  /** Calls allowed to wait for a slot before rejection. */
  readonly queue: number;
}

/** Resilience policy declared for one outbound adapter. */
export interface ResiliencePolicyConfig {
  /** Per-attempt timeout. */
  readonly timeoutMs: number;
  /** Default: {@link TimeoutStrategy.Aggressive}. */
  readonly timeoutStrategy?: TimeoutStrategy;
  /** Whether the signal is aborted when the call returns. Default true; set false for streams. */
  readonly abortOnReturn?: boolean;
  /** Budget for the whole call, retries included. */
  readonly totalTimeoutMs?: number;
  readonly retry?: ResilienceRetryConfig;
  readonly circuitBreaker?: ResilienceCircuitBreakerConfig;
  readonly bulkhead?: ResilienceBulkheadConfig;
  /** Decides which errors are retried and counted by the breaker. Defaults to `isTransientError`. */
  readonly isTransient?: (error: unknown) => boolean;
}

/** Policies used when the application does not override them. */
export const defaultPolicies: Record<
  ResiliencePolicyName,
  ResiliencePolicyConfig
> = {
  [ResiliencePolicyName.Database]: {
    timeoutMs: 2_000,
    timeoutStrategy: TimeoutStrategy.Cooperative,
    totalTimeoutMs: 5_000,
    retry: { maxAttempts: 3, initialDelayMs: 50, maxDelayMs: 500 },
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 30_000 },
  },
  [ResiliencePolicyName.Cache]: {
    timeoutMs: 100,
    totalTimeoutMs: 200,
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 10_000 },
  },
  [ResiliencePolicyName.ExternalApi]: {
    timeoutMs: 5_000,
    totalTimeoutMs: 15_000,
    retry: { maxAttempts: 3, initialDelayMs: 200, maxDelayMs: 2_000 },
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 30_000 },
    bulkhead: { limit: 20, queue: 20 },
  },
  [ResiliencePolicyName.Ai]: {
    timeoutMs: 60_000,
    timeoutStrategy: TimeoutStrategy.Cooperative,
    totalTimeoutMs: 90_000,
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 60_000 },
    bulkhead: { limit: 5, queue: 10 },
  },
  [ResiliencePolicyName.AiStreaming]: {
    timeoutMs: 120_000,
    timeoutStrategy: TimeoutStrategy.Cooperative,
    abortOnReturn: false,
    totalTimeoutMs: 300_000,
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 60_000 },
    bulkhead: { limit: 5, queue: 10 },
  },
  [ResiliencePolicyName.Email]: {
    timeoutMs: 10_000,
    totalTimeoutMs: 20_000,
    retry: { maxAttempts: 3, initialDelayMs: 500, maxDelayMs: 5_000 },
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 60_000 },
  },
  [ResiliencePolicyName.Queue]: {
    timeoutMs: 3_000,
    totalTimeoutMs: 10_000,
    retry: { maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 1_000 },
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 15_000 },
  },
};
