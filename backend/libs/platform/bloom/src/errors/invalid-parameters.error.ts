import { FailureKind } from '@platform/kernel';
import { BloomError } from './bloom-error.js';
import { BloomErrorCode } from './bloom-error-code.enum.js';

/** Un tamaño, una tasa, un nombre o una definición están fuera de rango. */
export class InvalidParametersError extends BloomError {
  constructor(message: string) {
    super(
      BloomErrorCode.InvalidParameters,
      message,
      FailureKind.ProtocolViolation,
    );
  }
}
