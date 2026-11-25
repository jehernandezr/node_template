import { FailureKind, PlatformError } from '@platform/kernel';
import { PrimitivesErrorCode } from './primitives-error-code.enum.js';

/** An argument does not meet the expected range or type. It is a programming error. */
export class InvalidArgumentError extends PlatformError {
  override readonly code = PrimitivesErrorCode.InvalidArgument;

  constructor(argument: string, expectation: string) {
    super(`Invalid argument "${argument}": ${expectation}`, {
      failureKind: FailureKind.ProtocolViolation,
      details: { argument, expectation },
    });
  }
}
