import { PlatformError } from '@platform/kernel';
import { SchedulingErrorCode } from './scheduling-error-code.enum.js';

/** The schedule of a job is not valid: non-positive interval or jitter out of range. */
export class InvalidJobScheduleError extends PlatformError {
  override readonly code = SchedulingErrorCode.InvalidSchedule;

  constructor(jobName: string, reason: string) {
    super(`Calendario inválido para el job ${jobName}: ${reason}`, {
      details: { jobName, reason },
    });
  }
}
