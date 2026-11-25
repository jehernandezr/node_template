/**
 * How the wait is distributed within the exponential ceiling
 * `min(maxMs, baseMs * factor^(attempt - 1))`.
 * - `None`: waits exactly the ceiling (exponential without jitter).
 * - `FullJitter`: uniform wait in `[0, ceiling)`.
 * - `EqualJitter`: uniform wait in `[ceiling / 2, ceiling)`.
 */
export enum BackoffStrategy {
  None = 'none',
  FullJitter = 'full-jitter',
  EqualJitter = 'equal-jitter',
}
