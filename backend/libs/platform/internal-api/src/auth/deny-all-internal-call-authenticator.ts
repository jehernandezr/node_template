import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalCallAuthenticator } from './internal-call-authenticator.js';

/**
 * Authenticator that rejects every call. The module uses it when it does not receive
 * the `http` options: without a secret, the controller accepts nothing instead of
 * accepting everything.
 */
export class DenyAllInternalCallAuthenticator extends InternalCallAuthenticator {
  override authenticate(): Promise<void> {
    return Promise.reject(
      new InternalApiError(
        InternalApiErrorCode.Unauthenticated,
        'The internal call is not authenticated',
      ),
    );
  }
}
