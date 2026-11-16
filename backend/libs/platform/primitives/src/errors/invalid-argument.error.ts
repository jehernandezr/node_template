import { FailureKind, PlatformError } from '@platform/kernel';
import { PrimitivesErrorCode } from './primitives-error-code.enum.js';

/** Un argumento no cumple el rango o el tipo esperado. Es un error de programación. */
export class InvalidArgumentError extends PlatformError {
  override readonly code = PrimitivesErrorCode.InvalidArgument;

  constructor(argument: string, expectation: string) {
    super(`Invalid argument "${argument}": ${expectation}`, {
      failureKind: FailureKind.ProtocolViolation,
      details: { argument, expectation },
    });
  }
}
