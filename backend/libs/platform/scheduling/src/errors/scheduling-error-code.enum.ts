/** Códigos de error de `@platform/scheduling`. */
export enum SchedulingErrorCode {
  InvalidSchedule = 'PLATFORM.SCHEDULING.INVALID_SCHEDULE',
  InvalidCronExpression = 'PLATFORM.SCHEDULING.INVALID_CRON_EXPRESSION',
  DuplicateJob = 'PLATFORM.SCHEDULING.DUPLICATE_JOB',
  UnknownJob = 'PLATFORM.SCHEDULING.UNKNOWN_JOB',
}
