/** Metrics that the `JobRunner` publishes. */
export enum SchedulingMetric {
  /** Counter of runs per job and result. */
  Runs = 'platform.scheduling.runs',
  /** Histogram of the duration of each run, in milliseconds. */
  RunDuration = 'platform.scheduling.run.duration',
}

/** Attributes of the `JobRunner` metrics. */
export enum SchedulingMetricAttribute {
  Job = 'job',
  Result = 'result',
}

/** Result of a run. */
export enum JobRunResult {
  Succeeded = 'succeeded',
  Failed = 'failed',
  /** An exclusive job did not run because another process holds the lock. */
  Skipped = 'skipped',
}
