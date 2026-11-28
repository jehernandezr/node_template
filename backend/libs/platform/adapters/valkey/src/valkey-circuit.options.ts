/** Deadline and breaker of every Valkey command. */
export interface ValkeyCircuitOptions {
  /** Longest a command may take before it counts as unavailable. */
  readonly deadlineMs: number;
  /** Consecutive unavailable commands that open the circuit. */
  readonly consecutiveFailures: number;
  /** Time the circuit stays open before a trial command. */
  readonly halfOpenAfterMs: number;
}
