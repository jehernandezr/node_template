import { FailureKind, PlatformError } from '@platform/kernel';
import { PrimitivesErrorCode } from './primitives-error-code.enum.js';

/**
 * El valor no se puede representar como JSON canónico. `path` señala la
 * posición (por ejemplo `$.items[2].price`); no se incluye el valor.
 */
export class NonJsonValueError extends PlatformError {
  override readonly code = PrimitivesErrorCode.NonJsonValue;

  constructor(path: string, reason: string) {
    super(`Value at ${path} is not canonical JSON: ${reason}`, {
      failureKind: FailureKind.ProtocolViolation,
      details: { path, reason },
    });
  }
}
