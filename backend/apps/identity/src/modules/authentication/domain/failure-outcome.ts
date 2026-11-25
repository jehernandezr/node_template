/** What a sign-in failure left in the counters. */
export interface FailureOutcome {
  /** Milliseconds of origin lockout, if this failure activated it. */
  readonly lockedForMs?: number;
  readonly protectedModeEnabled: boolean;
}
