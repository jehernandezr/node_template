export enum JobScheduleKind {
  Interval = 'interval',
  Cron = 'cron',
}

export interface IntervalJobSchedule {
  readonly kind: JobScheduleKind.Interval;
  readonly everyMs: number;
  /** Fracción de `everyMs` que se suma o resta al azar entre corridas. Por defecto 0. */
  readonly jitterRatio?: number;
}

export interface CronJobSchedule {
  /** Expresión en UTC de 5 o 6 campos. */
  readonly kind: JobScheduleKind.Cron;
  readonly expression: string;
}

/** Cuándo corre un job: cada cierto tiempo o según una expresión cron. */
export type JobSchedule = IntervalJobSchedule | CronJobSchedule;
