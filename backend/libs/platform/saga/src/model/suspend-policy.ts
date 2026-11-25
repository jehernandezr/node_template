/** Limits of the suspension cycle of a step. */
export interface SuspendPolicy {
  readonly maxSuspendAttempts: number;
  readonly maxSuspendAgeMs: number;
  /** Wait before retrying after the given failed attempt (from 1). */
  readonly backoff: (attempt: number) => number;
}
