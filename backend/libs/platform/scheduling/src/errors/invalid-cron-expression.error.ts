import { PlatformError } from '@platform/kernel';
import { SchedulingErrorCode } from './scheduling-error-code.enum.js';

/** Una expresión cron no tiene 5 o 6 campos válidos o no tiene ninguna fecha futura. */
export class InvalidCronExpressionError extends PlatformError {
  override readonly code = SchedulingErrorCode.InvalidCronExpression;

  constructor(expression: string, reason: string) {
    super(`Expresión cron inválida "${expression}": ${reason}`, {
      details: { expression, reason },
    });
  }
}
