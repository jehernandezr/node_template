import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalCallAuthenticator } from './internal-call-authenticator.js';

/**
 * Autenticador que rechaza toda llamada. El módulo lo usa cuando no recibe
 * las opciones `http`: sin secreto, el controller no acepta nada en lugar de
 * aceptarlo todo.
 */
export class DenyAllInternalCallAuthenticator extends InternalCallAuthenticator {
  authenticate(): Promise<void> {
    return Promise.reject(
      new InternalApiError(
        InternalApiErrorCode.Unauthenticated,
        'The internal call is not authenticated',
      ),
    );
  }
}
