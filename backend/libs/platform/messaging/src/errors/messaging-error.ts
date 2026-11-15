import {
  PlatformError,
  type FailureKind,
  type PlatformErrorOptions,
} from '@platform/kernel';
import { MessagingErrorCode } from './messaging-error-code.enum.js';

/**
 * Error base de `@platform/messaging`, con un `code` estable. Un error de
 * mensajería es definitivo salvo que diga lo contrario: `failureKind` es
 * `Transient` solo si se declaró `retryable`, así el clasificador nunca lo
 * convierte en reintento por su `cause`. El mensaje no incluye valores crudos
 * de entrada.
 */
export class MessagingError extends PlatformError {
  override readonly code: MessagingErrorCode;
  declare readonly failureKind: FailureKind;

  constructor(
    code: MessagingErrorCode,
    message: string,
    options: PlatformErrorOptions = {},
  ) {
    super(message, options);
    this.code = code;
  }
}
