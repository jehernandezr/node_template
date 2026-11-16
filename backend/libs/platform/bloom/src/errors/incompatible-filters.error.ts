import { FailureKind } from '@platform/kernel';
import { BloomError } from './bloom-error.js';
import { BloomErrorCode } from './bloom-error-code.enum.js';

/** Se combinan dos filtros con parámetros distintos. */
export class IncompatibleFiltersError extends BloomError {
  constructor(message: string) {
    super(
      BloomErrorCode.IncompatibleFilters,
      message,
      FailureKind.ProtocolViolation,
    );
  }
}
