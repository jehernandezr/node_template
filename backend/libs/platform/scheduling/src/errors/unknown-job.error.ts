import { PlatformError } from '@platform/kernel';
import { SchedulingErrorCode } from './scheduling-error-code.enum.js';

/** A run was requested for a job that is not registered. */
export class UnknownJobError extends PlatformError {
  override readonly code = SchedulingErrorCode.UnknownJob;

  constructor(jobName: string) {
    super(`No hay un job registrado con el nombre ${jobName}`, {
      details: { jobName },
    });
  }
}
