import { PlatformError } from '@platform/kernel';
import { SchedulingErrorCode } from './scheduling-error-code.enum.js';

/** A job with the same name was registered twice. */
export class DuplicateJobError extends PlatformError {
  override readonly code = SchedulingErrorCode.DuplicateJob;

  constructor(jobName: string) {
    super(`Ya hay un job registrado con el nombre ${jobName}`, {
      details: { jobName },
    });
  }
}
