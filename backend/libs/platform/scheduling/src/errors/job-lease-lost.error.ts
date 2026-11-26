import { PlatformError } from '@platform/kernel';
import { SchedulingErrorCode } from './scheduling-error-code.enum.js';

/** An exclusive job could not renew its lock while it ran, so another process may already run it. */
export class JobLeaseLostError extends PlatformError {
  override readonly code = SchedulingErrorCode.LeaseLost;

  constructor(jobName: string) {
    super(`Job ${jobName} lost its lock while it ran`, {
      details: { jobName },
    });
  }
}
