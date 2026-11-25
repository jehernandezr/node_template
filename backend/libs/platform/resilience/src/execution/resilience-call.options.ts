import type { Deadline } from '@platform/primitives';

/** Options of each call to `ResilienceRegistry.execute`. */
export interface ResilienceCallOptions {
  /** Allows retries. Off by default: a failing call is never repeated. */
  readonly idempotent?: boolean;
  /** Dependency whose breaker and bulkhead are used. Defaults to the policy name. */
  readonly dependencyKey?: string;
  /** Caller cancellation: cuts retries and pending waits and rejects with the signal's reason. */
  readonly signal?: AbortSignal;
  /**
   * Caller deadline. The whole call, retries and waits included, does not
   * go past it; if the policy also has a budget, the nearest one wins.
   */
  readonly deadline?: Deadline;
  /** Budget of the whole call, retries included. Replaces the policy's. */
  readonly totalTimeoutMs?: number;
}

/** What the operation knows about the attempt it runs. */
export interface ResilienceAttempt {
  /** Attempt number, starting at 1. */
  readonly number: number;
  /**
   * Limit of this attempt: `deadline.child(timeoutMs)` of the call's
   * deadline, or `timeoutMs` from now if the call has no deadline. It is passed
   * down.
   */
  readonly deadline: Deadline;
}

/** Operation that `ResilienceRegistry.execute` runs. */
export type ResilientOperation<T> = (
  signal: AbortSignal,
  attempt: ResilienceAttempt,
) => Promise<T>;
