import { FailureKind } from './failure-kind.js';
import { KernelErrorCode } from './kernel-error-code.enum.js';
import { PlatformError } from './platform-error.js';

/**
 * Un argumento no cumple el rango o el tipo esperado. Es la falla por defecto
 * de `Guard`: una librería que necesita su propio tipo lo pasa al construir la guarda.
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
