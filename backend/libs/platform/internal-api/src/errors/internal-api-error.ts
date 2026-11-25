import { FailureKind, PlatformError } from '@platform/kernel';
import { InternalApiErrorCode } from './internal-api-error-code.enum.js';

/**
 * Thrown for contract violations when defining or registering operations, and
 * for invalid configuration. Calls never throw it: the client and the
 * router report contract problems as a `CallOutcome`.
 */
export class InternalApiError extends PlatformError {
  override readonly code: InternalApiErrorCode;

  constructor(
    code: InternalApiErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    // A broken contract is a protocol violation for the classifier.
    super(message, {
      failureKind: FailureKind.ProtocolViolation,
      ...(details === undefined ? {} : { details }),
    });
    this.code = code;
  }
}
