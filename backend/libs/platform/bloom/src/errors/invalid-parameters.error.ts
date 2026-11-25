import { FailureKind } from '@platform/kernel';
import { BloomError } from './bloom-error.js';
import { BloomErrorCode } from './bloom-error-code.enum.js';

/** A size, a rate, a name or a definition is out of range. */
export class InvalidParametersError extends BloomError {
  constructor(message: string) {
    super(
      BloomErrorCode.InvalidParameters,
      message,
      FailureKind.ProtocolViolation,
    );
  }
}
