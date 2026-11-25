import { FailureKind } from './failure-kind.js';
import { KernelErrorCode } from './kernel-error-code.enum.js';
import { PlatformError } from './platform-error.js';

/**
 * An argument does not meet the expected range or type. It is the default failure
 * of `Guard`: a library that needs its own type passes it when building the guard.
 */
export class GuardViolationError extends PlatformError {
  override readonly code = KernelErrorCode.GuardViolation;

  constructor(name: string, expectation: string) {
    super(`${name} must be ${expectation}`, {
      failureKind: FailureKind.ProtocolViolation,
      details: { argument: name, expectation },
    });
  }
}
