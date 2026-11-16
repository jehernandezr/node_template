import { PlatformError } from '@platform/kernel';
import { SchedulingErrorCode } from './scheduling-error-code.enum.js';

/** Se registró dos veces un job con el mismo nombre. */
export class DuplicateJobError extends PlatformError {
  override readonly code = SchedulingErrorCode.DuplicateJob;

  constructor(jobName: string) {
    super(`Ya hay un job registrado con el nombre ${jobName}`, {
      details: { jobName },
    });
  }
}
