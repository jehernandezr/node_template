import { PlatformError } from '@platform/kernel';
import { SchedulingErrorCode } from './scheduling-error-code.enum.js';

/** El calendario de un job no es válido: intervalo no positivo o jitter fuera de rango. */
export class InvalidJobScheduleError extends PlatformError {
  override readonly code = SchedulingErrorCode.InvalidSchedule;

  constructor(jobName: string, reason: string) {
    super(`Calendario inválido para el job ${jobName}: ${reason}`, {
      details: { jobName, reason },
    });
  }
}
