import { PlatformError } from '@platform/kernel';
import { PrimitivesErrorCode } from './primitives-error-code.enum.js';

/**
 * El token de un claim de idempotencia ya no es el vigente: otro intento tomó
 * el lease, la operación ya terminó o el claim se liberó.
 */
export class StaleClaimError extends PlatformError {
  override readonly code = PrimitivesErrorCode.StaleClaim;

  constructor(operation: 'complete' | 'release') {
    super(`Cannot ${operation}: the claim token is no longer current`, {
      details: { operation },
    });
  }
}
