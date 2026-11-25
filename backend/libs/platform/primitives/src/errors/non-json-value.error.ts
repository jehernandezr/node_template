import { FailureKind, PlatformError } from '@platform/kernel';
import { PrimitivesErrorCode } from './primitives-error-code.enum.js';

/**
 * The value cannot be represented as canonical JSON. `path` points to the
 * position (for example `$.items[2].price`); the value is not included.
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
