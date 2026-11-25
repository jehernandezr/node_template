import { PlatformError } from '@platform/kernel';
import { PrimitivesErrorCode } from './primitives-error-code.enum.js';

/**
 * The token of an idempotency claim is no longer the current one: another attempt took
 * the lease, the operation already finished or the claim was released.
 */
export class StaleClaimError extends PlatformError {
  override readonly code = PrimitivesErrorCode.StaleClaim;

  constructor(operation: 'complete' | 'release') {
    super(`Cannot ${operation}: the claim token is no longer current`, {
      details: { operation },
    });
  }
}
