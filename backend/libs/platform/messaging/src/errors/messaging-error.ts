import {
  PlatformError,
  type FailureKind,
  type PlatformErrorOptions,
} from '@platform/kernel';
import { MessagingErrorCode } from './messaging-error-code.enum.js';

/**
 * Base error of `@platform/messaging`, with a stable `code`. A messaging
 * error is final unless it says otherwise: `failureKind` is
 * `Transient` only if it was declared `retryable`, so the classifier never
 * turns it into a retry because of its `cause`. The message does not include raw
 * input values.
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
