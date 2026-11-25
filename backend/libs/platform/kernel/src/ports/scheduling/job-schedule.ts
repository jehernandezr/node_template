export enum JobScheduleKind {
  Interval = 'interval',
  Cron = 'cron',
}

export interface IntervalJobSchedule {
  readonly kind: JobScheduleKind.Interval;
  readonly everyMs: number;
  /** Fraction of `everyMs` randomly added or subtracted between runs. Defaults to 0. */
  readonly jitterRatio?: number;
}

export interface CronJobSchedule {
  /** UTC expression with 5 or 6 fields. */
  readonly kind: JobScheduleKind.Cron;
  readonly expression: string;
}

/** When a job runs: at a fixed interval or according to a cron expression. */
export type JobSchedule = IntervalJobSchedule | CronJobSchedule;
