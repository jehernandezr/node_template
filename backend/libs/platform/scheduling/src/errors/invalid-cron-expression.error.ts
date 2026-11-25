import { PlatformError } from '@platform/kernel';
import { SchedulingErrorCode } from './scheduling-error-code.enum.js';

/** A cron expression does not have 5 or 6 valid fields or has no future date. */
export class InvalidCronExpressionError extends PlatformError {
  override readonly code = SchedulingErrorCode.InvalidCronExpression;

  constructor(expression: string, reason: string) {
    super(`Invalid cron expression "${expression}": ${reason}`, {
      details: { expression, reason },
    });
  }
}
