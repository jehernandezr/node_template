/** What the scheduler hands to each run of a job. */
export interface JobContext {
  /** Aborts when `timeoutMs` runs out or the application shuts down. */
  readonly signal: AbortSignal;
  readonly startedAt: Date;
  /** Identifier of this run, to correlate logs and metrics. */
  readonly runId: string;
}
